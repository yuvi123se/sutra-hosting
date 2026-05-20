import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const OWNER_ID = process.env.OWNER_ID || "1304126568817229875";
const JWT_SECRET = process.env.SESSION_SECRET || "sutra_secret_dev";

// ─── Env Var Validation ───────────────────────────────────────────────────────
const REQUIRED_ENV = ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_REDIRECT_URI"];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error("❌ Missing required env vars:", missing.join(", "));
  console.error("   Set these in your Render dashboard under Environment.");
  process.exit(1);
}
console.log("✅ Discord Client ID:", process.env.DISCORD_CLIENT_ID);
console.log("✅ Redirect URI:", process.env.DISCORD_REDIRECT_URI);

// ─── Database Setup ───────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "sutra-hosting.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    discriminator TEXT,
    avatar TEXT,
    email TEXT,
    plan TEXT DEFAULT 'free',
    credits REAL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token TEXT,
    code TEXT,
    runtime TEXT DEFAULT 'nodejs',
    country TEXT DEFAULT 'india',
    status TEXT DEFAULT 'stopped',
    ram_mb INTEGER DEFAULT 256,
    cpu_limit INTEGER DEFAULT 10,
    uptime_seconds INTEGER DEFAULT 0,
    restart_count INTEGER DEFAULT 0,
    plan TEXT DEFAULT 'free',
    last_started INTEGER,
    last_log TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(discord_id)
  );

  CREATE TABLE IF NOT EXISTS sessions_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT,
    action TEXT,
    ip TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS bot_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT NOT NULL,
    line TEXT,
    stream TEXT DEFAULT 'stdout',
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

// ─── DB Migrations (safe, idempotent) ─────────────────────────────────────────
const migrations = [
  "ALTER TABLE bots ADD COLUMN code TEXT",
  "ALTER TABLE bots ADD COLUMN last_started INTEGER",
  "ALTER TABLE bots ADD COLUMN last_log TEXT",
];
for (const m of migrations) {
  try { db.exec(m); } catch (_) {}
}

// ─── In-memory process map: botId → { process, startedAt, logsBuffer } ────────
const runningProcesses = new Map();

// ─── Simple JWT ────────────────────────────────────────────────────────────────
function b64url(str) {
  return Buffer.from(str).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJWT(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
  }));
  const sig = crypto.createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`).digest("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,  // JWT auth — safe to allow all origins
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifyJWT(auth.slice(7));
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  req.userId = payload.discord_id;
  next();
}

function requireOwner(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifyJWT(auth.slice(7));
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  if (payload.discord_id !== OWNER_ID) return res.status(403).json({ error: "Forbidden: Owner only" });
  req.userId = payload.discord_id;
  next();
}

// ─── Plan Config ───────────────────────────────────────────────────────────────
const PLANS = {
  free:    { name: "Free",    maxBots: 1,  ramMb: 256,  cpuLimit: 10,  countries: ["india"], defaultCountry: "india", uptimePercent: "95%",    price: "Free" },
  starter: { name: "Starter", maxBots: 3,  ramMb: 512,  cpuLimit: 25,  countries: ["india","singapore","us-east","europe"], defaultCountry: "india", uptimePercent: "99%",    price: "₹149/mo" },
  pro:     { name: "Pro",     maxBots: 10, ramMb: 1024, cpuLimit: 50,  countries: ["india","singapore","us-east","us-west","europe","japan"], defaultCountry: "india", uptimePercent: "99.9%",  price: "₹399/mo" },
  ultra:   { name: "Ultra",   maxBots: -1, ramMb: 4096, cpuLimit: 100, countries: ["india","singapore","us-east","us-west","europe","japan","australia","brazil"], defaultCountry: "india", uptimePercent: "99.99%", price: "₹999/mo" }
};

// ─── Bot Runner ────────────────────────────────────────────────────────────────
/**
 * Determine the command and args to execute a bot for a given runtime.
 * The bot code is written to a temp file, then executed as a child process.
 */
function getRuntimeCmd(runtime) {
  switch (runtime) {
    case "python": return { cmd: "python3", ext: ".py" };
    case "java":   return { cmd: "java",    ext: ".java" };
    case "go":     return { cmd: "go",      ext: ".go",  args: ["run"] };
    case "nodejs":
    default:       return { cmd: "node",    ext: ".js" };
  }
}

function appendLog(botId, line, stream = "stdout") {
  const trimmed = line.slice(0, 2000); // cap per line
  try {
    db.prepare("INSERT INTO bot_logs (bot_id, line, stream) VALUES (?, ?, ?)").run(botId, trimmed, stream);
    // Keep only last 200 log lines per bot
    db.prepare(`
      DELETE FROM bot_logs WHERE bot_id = ? AND id NOT IN (
        SELECT id FROM bot_logs WHERE bot_id = ? ORDER BY id DESC LIMIT 200
      )
    `).run(botId, botId);
    // Update last_log snapshot on the bot row
    db.prepare("UPDATE bots SET last_log = ? WHERE id = ?").run(trimmed, botId);
  } catch (_) {}
}

/**
 * Actually start a bot process. Returns true if launched successfully.
 * Each bot gets its own temp directory and isolated environment.
 */
async function startBotProcess(bot) {
  if (runningProcesses.has(bot.id)) {
    return { ok: false, error: "Bot is already running" };
  }

  if (!bot.code && !bot.token) {
    return { ok: false, error: "Bot has no code or token to run" };
  }

  // Create isolated temp dir for this bot
  const botDir = path.join(os.tmpdir(), `sutra-bot-${bot.id}`);
  fs.mkdirSync(botDir, { recursive: true });

  const { cmd, ext, args = [] } = getRuntimeCmd(bot.runtime);

  // Write bot code to temp file
  const codeFile = path.join(botDir, `bot${ext}`);
  const code = bot.code || `// No code provided\nconsole.log('Bot ${bot.name} started with token-only mode');`;
  fs.writeFileSync(codeFile, code, "utf8");

  // Build env: inherit system env, inject bot token, add node_modules path
  const botEnv = {
    ...process.env,
    TOKEN: bot.token || "",
    BOT_ID: bot.id,
    BOT_NAME: bot.name,
    NODE_PATH: path.join(__dirname, "node_modules"),
  };

  let spawnArgs;
  if (bot.runtime === "go") {
    spawnArgs = [...args, codeFile];
  } else if (bot.runtime === "java") {
    // For Java: compile first, then run
    try {
      const { execSync } = await import("child_process");
      execSync(`javac "${codeFile}"`, { cwd: botDir });
    } catch (e) {
      fs.rmSync(botDir, { recursive: true, force: true });
      return { ok: false, error: `Java compile error: ${e.message}` };
    }
    const className = path.basename(codeFile, ".java");
    spawnArgs = ["-cp", botDir, className];
  } else {
    spawnArgs = [...args, codeFile];
  }

  let proc;
  try {
    proc = spawn(cmd, spawnArgs, {
      cwd: botDir,
      env: botEnv,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
  } catch (e) {
    fs.rmSync(botDir, { recursive: true, force: true });
    return { ok: false, error: `Failed to spawn process: ${e.message}` };
  }

  const startedAt = Date.now();

  proc.stdout.on("data", (data) => {
    appendLog(bot.id, data.toString().trim());
  });
  proc.stderr.on("data", (data) => {
    appendLog(bot.id, data.toString().trim(), "stderr");
  });

  proc.on("exit", (code, signal) => {
    runningProcesses.delete(bot.id);
    // Clean up temp dir
    try { fs.rmSync(botDir, { recursive: true, force: true }); } catch (_) {}

    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const bot_ = db.prepare("SELECT * FROM bots WHERE id = ?").get(bot.id);
    if (bot_) {
      db.prepare(
        "UPDATE bots SET status='stopped', uptime_seconds=uptime_seconds+?, updated_at=strftime('%s','now') WHERE id=?"
      ).run(elapsed, bot.id);
    }
    appendLog(bot.id, `[sutra] Process exited (code=${code}, signal=${signal})`, "system");
  });

  proc.on("error", (err) => {
    appendLog(bot.id, `[sutra] Process error: ${err.message}`, "stderr");
  });

  runningProcesses.set(bot.id, { process: proc, startedAt, dir: botDir });

  // Update DB
  db.prepare(
    "UPDATE bots SET status='running', last_started=?, updated_at=strftime('%s','now') WHERE id=?"
  ).run(Math.floor(startedAt / 1000), bot.id);

  appendLog(bot.id, `[sutra] Bot "${bot.name}" started (runtime=${bot.runtime})`, "system");
  return { ok: true };
}

function stopBotProcess(botId, reason = "user request") {
  const entry = runningProcesses.get(botId);
  if (!entry) return false;

  appendLog(botId, `[sutra] Stopping bot (reason: ${reason})`, "system");

  try {
    entry.process.kill("SIGTERM");
    // Force kill after 5s if it doesn't die
    setTimeout(() => {
      try { entry.process.kill("SIGKILL"); } catch (_) {}
    }, 5000);
  } catch (_) {}

  runningProcesses.delete(botId);
  return true;
}

// Uptime heartbeat: update uptime_seconds for all running bots every 30s
setInterval(() => {
  for (const [botId] of runningProcesses) {
    try {
      db.prepare(
        "UPDATE bots SET uptime_seconds=uptime_seconds+30 WHERE id=? AND status='running'"
      ).run(botId);
    } catch (_) {}
  }
}, 30_000);

// On shutdown, stop all bots gracefully
function shutdownAll() {
  console.log("\n🛑 Stopping all running bots...");
  for (const [botId] of runningProcesses) {
    stopBotProcess(botId, "server shutdown");
  }
  db.close();
  process.exit(0);
}
process.on("SIGINT", shutdownAll);
process.on("SIGTERM", shutdownAll);

// ─── Discord OAuth ─────────────────────────────────────────────────────────────
app.get("/auth/discord", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email"
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// ─── Helper: upsert Discord user and return JWT ───────────────────────────────
async function upsertDiscordUser(accessToken, ip) {
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!userRes.ok) {
    const body = await userRes.text();
    throw new Error(`Discord user fetch failed (${userRes.status}): ${body.slice(0, 200)}`);
  }
  const discordUser = await userRes.json();

  const existing = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discordUser.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, discord_id, username, discriminator, avatar, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      discordUser.id,
      discordUser.username,
      discordUser.discriminator || "0",
      discordUser.avatar,
      discordUser.email || null
    );
  } else {
    db.prepare(`
      UPDATE users SET username=?, discriminator=?, avatar=?, email=?, updated_at=strftime('%s','now')
      WHERE discord_id=?
    `).run(
      discordUser.username,
      discordUser.discriminator || "0",
      discordUser.avatar,
      discordUser.email || null,
      discordUser.id
    );
  }

  db.prepare("INSERT INTO sessions_log (discord_id, action, ip) VALUES (?, 'login', ?)")
    .run(discordUser.id, ip || "unknown");

  return signJWT({ discord_id: discordUser.id });
}

// ─── OAuth callback: just bounce the code to the frontend ─────────────────────
// The frontend exchanges the code with Discord directly (avoids Render IP rate limits)
app.get("/auth/discord/callback", (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  if (error || !code) return res.redirect(`${frontendUrl}/?error=${error || "no_code"}`);
  // Pass code to frontend — it will exchange it and call /auth/discord/exchange
  res.redirect(`${frontendUrl}/auth/callback?code=${encodeURIComponent(code)}`);
});

// ─── verify: browser already exchanged code with Discord, sends us the access_token ──
// This is the PRIMARY auth path. The browser exchanges the code directly with
// Discord (using the user's own IP — never rate-limited), then POSTs the
// resulting access_token here. We verify it by fetching /users/@me, upsert the
// user, and return a signed JWT. The client_secret never leaves this server.
app.post("/auth/discord/verify", async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: "Missing access_token" });

  try {
    const jwt = await upsertDiscordUser(access_token, req.ip);
    res.json({ token: jwt });
  } catch (err) {
    console.error("verify error:", err.message);
    res.status(401).json({ error: err.message || "Auth failed" });
  }
});

// ─── exchange-code: FALLBACK — browser POSTs the raw Discord code here ────────
// Used only when the browser-side token exchange fails (e.g. confidential app
// that requires client_secret). This route still hits Discord from Render's IP
// and may 429, but it's a safety net for apps that can't use the /verify path.
app.post("/auth/discord/exchange-code", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    });

    const contentType = tokenRes.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const body = await tokenRes.text();
      throw new Error(`Discord error (${tokenRes.status}): ${body.slice(0, 200)}`);
    }
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(`Discord token error: ${JSON.stringify(tokenData)}`);
    }

    const jwt = await upsertDiscordUser(tokenData.access_token, req.ip);
    res.json({ token: jwt });
  } catch (err) {
    console.error("exchange-code error:", err.message);
    res.status(401).json({ error: err.message || "Auth failed" });
  }
});

app.post("/auth/logout", requireAuth, (req, res) => {
  db.prepare("INSERT INTO sessions_log (discord_id, action, ip) VALUES (?, 'logout', ?)")
    .run(req.userId, req.ip);
  res.json({ success: true });
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.set("Cache-Control", "no-store");
  const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user, isOwner: user.discord_id === OWNER_ID });
});

// ─── Plans ─────────────────────────────────────────────────────────────────────
app.get("/plans", (req, res) => {
  res.json(PLANS);
});

// ─── Bot Routes ────────────────────────────────────────────────────────────────
app.get("/bots", requireAuth, (req, res) => {
  const bots = db.prepare("SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC").all(req.userId);
  // Enrich with live running state
  const enriched = bots.map(b => ({
    ...b,
    isRunning: runningProcesses.has(b.id),
  }));
  res.json(enriched);
});

app.post("/bots", requireAuth, (req, res) => {
  const { name, token, code, runtime, country } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const plan = PLANS[user.plan] || PLANS.free;

  if (!name || name.trim().length < 2)
    return res.status(400).json({ error: "Bot name must be at least 2 characters" });

  const botCount = db.prepare("SELECT COUNT(*) as cnt FROM bots WHERE user_id = ?").get(user.discord_id);
  if (plan.maxBots !== -1 && botCount.cnt >= plan.maxBots) {
    return res.status(403).json({ error: `Your ${plan.name} plan allows only ${plan.maxBots} bot(s). Upgrade for more!` });
  }

  const selectedCountry = plan.countries.includes(country) ? country : plan.defaultCountry;
  const botId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO bots (id, user_id, name, token, code, runtime, country, status, ram_mb, cpu_limit, plan)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?)
  `).run(botId, user.discord_id, name.trim(), token || null, code || null, runtime || "nodejs", selectedCountry, plan.ramMb, plan.cpuLimit, user.plan);

  const bot = db.prepare("SELECT * FROM bots WHERE id = ?").get(botId);
  res.json(bot);
});

app.patch("/bots/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const { name, token, code, runtime, country } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(req.userId);
  const plan = PLANS[user.plan] || PLANS.free;

  // Stop if running before modifying
  if (runningProcesses.has(id)) {
    stopBotProcess(id, "bot updated");
    db.prepare("UPDATE bots SET status='stopped' WHERE id=?").run(id);
  }

  const updates = {};
  if (name) updates.name = name.trim();
  if (token !== undefined) updates.token = token;
  if (code !== undefined) updates.code = code;
  if (runtime) updates.runtime = runtime;
  if (country && plan.countries.includes(country)) updates.country = country;
  updates.updated_at = Math.floor(Date.now() / 1000);

  if (Object.keys(updates).length > 1) {
    const sets = Object.keys(updates).map(k => `${k}=?`).join(", ");
    db.prepare(`UPDATE bots SET ${sets} WHERE id=?`).run(...Object.values(updates), id);
  }

  const updated = db.prepare("SELECT * FROM bots WHERE id = ?").get(id);
  res.json(updated);
});

app.delete("/bots/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  stopBotProcess(id, "bot deleted");
  db.prepare("DELETE FROM bot_logs WHERE bot_id = ?").run(id);
  db.prepare("DELETE FROM bots WHERE id = ?").run(id);
  res.json({ success: true });
});

// ─── Bot Control Routes ────────────────────────────────────────────────────────

// Start a bot
app.post("/bots/:id/start", requireAuth, async (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  if (runningProcesses.has(id)) {
    return res.status(409).json({ error: "Bot is already running" });
  }

  const result = await startBotProcess(bot);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const updated = db.prepare("SELECT * FROM bots WHERE id = ?").get(id);
  res.json({ success: true, bot: updated });
});

// Stop a bot
app.post("/bots/:id/stop", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const stopped = stopBotProcess(id, "user request");
  if (!stopped) return res.status(409).json({ error: "Bot is not running" });

  db.prepare("UPDATE bots SET status='stopped', updated_at=strftime('%s','now') WHERE id=?").run(id);
  const updated = db.prepare("SELECT * FROM bots WHERE id = ?").get(id);
  res.json({ success: true, bot: updated });
});

// Restart a bot
app.post("/bots/:id/restart", requireAuth, async (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  stopBotProcess(id, "restart");
  // Brief pause before restarting
  await new Promise(r => setTimeout(r, 1000));

  db.prepare("UPDATE bots SET restart_count=restart_count+1 WHERE id=?").run(id);

  const freshBot = db.prepare("SELECT * FROM bots WHERE id = ?").get(id);
  const result = await startBotProcess(freshBot);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const updated = db.prepare("SELECT * FROM bots WHERE id = ?").get(id);
  res.json({ success: true, bot: updated });
});

// Get bot logs
app.get("/bots/:id/logs", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const lines = db.prepare(
    "SELECT line, stream, created_at FROM bot_logs WHERE bot_id = ? ORDER BY id DESC LIMIT 100"
  ).all(id).reverse();
  res.json({ logs: lines, isRunning: runningProcesses.has(id) });
});

// Get bot status (live)
app.get("/bots/:id/status", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const entry = runningProcesses.get(id);
  res.json({
    id,
    status: entry ? "running" : "stopped",
    isRunning: !!entry,
    startedAt: entry ? entry.startedAt : null,
    uptimeSeconds: entry ? Math.floor((Date.now() - entry.startedAt) / 1000) : bot.uptime_seconds,
  });
});

// ─── Admin Routes ──────────────────────────────────────────────────────────────
app.get("/admin/stats", requireOwner, (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
  const totalBots = db.prepare("SELECT COUNT(*) as cnt FROM bots").get();
  const planBreakdown = db.prepare("SELECT plan, COUNT(*) as cnt FROM users GROUP BY plan").all();
  const recentUsers = db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 10").all();
  const recentBots = db.prepare("SELECT b.*, u.username FROM bots b JOIN users u ON b.user_id=u.discord_id ORDER BY b.created_at DESC LIMIT 20").all();
  res.json({
    stats: {
      totalUsers: totalUsers.cnt,
      totalBots: totalBots.cnt,
      runningBots: runningProcesses.size,
    },
    planBreakdown,
    recentUsers,
    recentBots
  });
});

app.get("/admin/users", requireOwner, (req, res) => {
  const users = db.prepare("SELECT u.*, (SELECT COUNT(*) FROM bots WHERE user_id=u.discord_id) as bot_count FROM users u ORDER BY created_at DESC").all();
  res.json(users);
});

app.get("/admin/bots", requireOwner, (req, res) => {
  const bots = db.prepare("SELECT b.*, u.username FROM bots b JOIN users u ON b.user_id=u.discord_id ORDER BY b.created_at DESC").all();
  const enriched = bots.map(b => ({ ...b, isRunning: runningProcesses.has(b.id) }));
  res.json(enriched);
});

app.patch("/admin/users/:discord_id/plan", requireOwner, (req, res) => {
  const { discord_id } = req.params;
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan" });
  db.prepare("UPDATE users SET plan=?, updated_at=strftime('%s','now') WHERE discord_id=?").run(plan, discord_id);
  res.json({ success: true });
});

app.delete("/admin/bots/:id", requireOwner, (req, res) => {
  const { id } = req.params;
  stopBotProcess(id, "admin delete");
  db.prepare("DELETE FROM bot_logs WHERE bot_id = ?").run(id);
  db.prepare("DELETE FROM bots WHERE id=?").run(id);
  res.json({ success: true });
});

app.post("/admin/bots/:id/start", requireOwner, async (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ?").get(id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  if (runningProcesses.has(id)) return res.status(409).json({ error: "Already running" });

  const result = await startBotProcess(bot);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true });
});

app.post("/admin/bots/:id/stop", requireOwner, (req, res) => {
  const { id } = req.params;
  const stopped = stopBotProcess(id, "admin stop");
  if (!stopped) return res.status(409).json({ error: "Bot is not running" });
  db.prepare("UPDATE bots SET status='stopped', updated_at=strftime('%s','now') WHERE id=?").run(id);
  res.json({ success: true });
});

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Sutra Hosting API",
    status: "online",
    version: "2.1.0",
    runningBots: runningProcesses.size,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Sutra Hosting API running on http://localhost:${PORT}`);
  console.log(`👑 Owner ID: ${OWNER_ID}`);
  console.log(`📦 Database: ${DB_PATH}\n`);
});
