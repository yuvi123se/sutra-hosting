import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
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
const OWNER_USERNAME = process.env.OWNER_USERNAME || "admin";
const JWT_SECRET = process.env.SESSION_SECRET || "sutra_secret_dev";

// ─── Database Setup ────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "sutra-hosting.db");
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
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
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
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

// ─── In-memory process map ─────────────────────────────────────────────────────
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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifyJWT(auth.slice(7));
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  req.userId = payload.user_id;
  next();
}

function requireOwner(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifyJWT(auth.slice(7));
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.user_id);
  if (!user || user.username !== OWNER_USERNAME) return res.status(403).json({ error: "Forbidden: Owner only" });
  req.userId = payload.user_id;
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
  const trimmed = line.slice(0, 2000);
  try {
    db.prepare("INSERT INTO bot_logs (bot_id, line, stream) VALUES (?, ?, ?)").run(botId, trimmed, stream);
    db.prepare(`
      DELETE FROM bot_logs WHERE bot_id = ? AND id NOT IN (
        SELECT id FROM bot_logs WHERE bot_id = ? ORDER BY id DESC LIMIT 200
      )
    `).run(botId, botId);
    db.prepare("UPDATE bots SET last_log = ? WHERE id = ?").run(trimmed, botId);
  } catch (_) {}
}

async function startBotProcess(bot) {
  if (runningProcesses.has(bot.id)) return { ok: false, error: "Bot is already running" };
  if (!bot.code && !bot.token) return { ok: false, error: "Bot has no code or token to run" };

  const botDir = path.join(os.tmpdir(), `sutra-bot-${bot.id}`);
  fs.mkdirSync(botDir, { recursive: true });

  const { cmd, ext, args = [] } = getRuntimeCmd(bot.runtime);
  const codeFile = path.join(botDir, `bot${ext}`);
  const code = bot.code || `console.log('Bot ${bot.name} started with token-only mode');`;
  fs.writeFileSync(codeFile, code, "utf8");

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
  proc.stdout.on("data", (data) => appendLog(bot.id, data.toString().trim()));
  proc.stderr.on("data", (data) => appendLog(bot.id, data.toString().trim(), "stderr"));

  proc.on("exit", (code, signal) => {
    runningProcesses.delete(bot.id);
    try { fs.rmSync(botDir, { recursive: true, force: true }); } catch (_) {}
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    try {
      db.prepare("UPDATE bots SET status='stopped', uptime_seconds=uptime_seconds+?, updated_at=strftime('%s','now') WHERE id=?").run(elapsed, bot.id);
    } catch (_) {}
    appendLog(bot.id, `[sutra] Process exited (code=${code}, signal=${signal})`, "system");
  });

  proc.on("error", (err) => appendLog(bot.id, `[sutra] Process error: ${err.message}`, "stderr"));

  runningProcesses.set(bot.id, { process: proc, startedAt, dir: botDir });
  db.prepare("UPDATE bots SET status='running', last_started=?, updated_at=strftime('%s','now') WHERE id=?").run(Math.floor(startedAt / 1000), bot.id);
  appendLog(bot.id, `[sutra] Bot "${bot.name}" started (runtime=${bot.runtime})`, "system");
  return { ok: true };
}

function stopBotProcess(botId, reason = "user request") {
  const entry = runningProcesses.get(botId);
  if (!entry) return false;
  appendLog(botId, `[sutra] Stopping bot (reason: ${reason})`, "system");
  try {
    entry.process.kill("SIGTERM");
    setTimeout(() => { try { entry.process.kill("SIGKILL"); } catch (_) {} }, 5000);
  } catch (_) {}
  runningProcesses.delete(botId);
  return true;
}

setInterval(() => {
  for (const [botId] of runningProcesses) {
    try { db.prepare("UPDATE bots SET uptime_seconds=uptime_seconds+30 WHERE id=? AND status='running'").run(botId); } catch (_) {}
  }
}, 30_000);

function shutdownAll() {
  console.log("\n🛑 Stopping all running bots...");
  for (const [botId] of runningProcesses) stopBotProcess(botId, "server shutdown");
  db.close();
  process.exit(0);
}
process.on("SIGINT", shutdownAll);
process.on("SIGTERM", shutdownAll);

// ─── Auth Routes ───────────────────────────────────────────────────────────────

// Register
app.post("/auth/register", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || username.trim().length < 3)
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  if (!password || password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
    return res.status(400).json({ error: "Username can only contain letters, numbers, and underscores" });

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim().toLowerCase());
  if (existing) return res.status(409).json({ error: "Username already taken" });

  try {
    const password_hash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, username, password_hash, email)
      VALUES (?, ?, ?, ?)
    `).run(id, username.trim().toLowerCase(), password_hash, email || null);

    db.prepare("INSERT INTO sessions_log (user_id, action, ip) VALUES (?, 'register', ?)").run(id, req.ip);

    const token = signJWT({ user_id: id });
    const user = db.prepare("SELECT id, username, email, avatar, plan, credits, created_at FROM users WHERE id = ?").get(id);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid username or password" });

  db.prepare("INSERT INTO sessions_log (user_id, action, ip) VALUES (?, 'login', ?)").run(user.id, req.ip);

  const token = signJWT({ user_id: user.id });
  const { password_hash: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Logout
app.post("/auth/logout", requireAuth, (req, res) => {
  db.prepare("INSERT INTO sessions_log (user_id, action, ip) VALUES (?, 'logout', ?)").run(req.userId, req.ip);
  res.json({ success: true });
});

// Me
app.get("/auth/me", requireAuth, (req, res) => {
  res.set("Cache-Control", "no-store");
  const user = db.prepare("SELECT id, username, email, avatar, plan, credits, created_at FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const isOwner = user.username === OWNER_USERNAME;
  res.json({ user, isOwner });
});

// ─── Plans ─────────────────────────────────────────────────────────────────────
app.get("/plans", (req, res) => res.json(PLANS));

// ─── Bot Routes ────────────────────────────────────────────────────────────────
app.get("/bots", requireAuth, (req, res) => {
  const bots = db.prepare("SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC").all(req.userId);
  res.json(bots.map(b => ({ ...b, isRunning: runningProcesses.has(b.id) })));
});

app.post("/bots", requireAuth, (req, res) => {
  const { name, token, code, runtime, country } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const plan = PLANS[user.plan] || PLANS.free;

  if (!name || name.trim().length < 2)
    return res.status(400).json({ error: "Bot name must be at least 2 characters" });

  const botCount = db.prepare("SELECT COUNT(*) as cnt FROM bots WHERE user_id = ?").get(user.id);
  if (plan.maxBots !== -1 && botCount.cnt >= plan.maxBots)
    return res.status(403).json({ error: `Your ${plan.name} plan allows only ${plan.maxBots} bot(s). Upgrade for more!` });

  const selectedCountry = plan.countries.includes(country) ? country : plan.defaultCountry;
  const botId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO bots (id, user_id, name, token, code, runtime, country, status, ram_mb, cpu_limit, plan)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?)
  `).run(botId, user.id, name.trim(), token || null, code || null, runtime || "nodejs", selectedCountry, plan.ramMb, plan.cpuLimit, user.plan);

  res.json(db.prepare("SELECT * FROM bots WHERE id = ?").get(botId));
});

app.patch("/bots/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const { name, token, code, runtime, country } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  const plan = PLANS[user.plan] || PLANS.free;

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

  res.json(db.prepare("SELECT * FROM bots WHERE id = ?").get(id));
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

app.post("/bots/:id/start", requireAuth, async (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  if (runningProcesses.has(id)) return res.status(409).json({ error: "Bot is already running" });
  const result = await startBotProcess(bot);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true, bot: db.prepare("SELECT * FROM bots WHERE id = ?").get(id) });
});

app.post("/bots/:id/stop", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  if (!stopBotProcess(id, "user request")) return res.status(409).json({ error: "Bot is not running" });
  db.prepare("UPDATE bots SET status='stopped', updated_at=strftime('%s','now') WHERE id=?").run(id);
  res.json({ success: true, bot: db.prepare("SELECT * FROM bots WHERE id = ?").get(id) });
});

app.post("/bots/:id/restart", requireAuth, async (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  stopBotProcess(id, "restart");
  await new Promise(r => setTimeout(r, 1000));
  db.prepare("UPDATE bots SET restart_count=restart_count+1 WHERE id=?").run(id);
  const freshBot = db.prepare("SELECT * FROM bots WHERE id = ?").get(id);
  const result = await startBotProcess(freshBot);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ success: true, bot: db.prepare("SELECT * FROM bots WHERE id = ?").get(id) });
});

app.get("/bots/:id/logs", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  const lines = db.prepare("SELECT line, stream, created_at FROM bot_logs WHERE bot_id = ? ORDER BY id DESC LIMIT 100").all(id).reverse();
  res.json({ logs: lines, isRunning: runningProcesses.has(id) });
});

app.get("/bots/:id/status", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  const entry = runningProcesses.get(id);
  res.json({
    id, status: entry ? "running" : "stopped", isRunning: !!entry,
    startedAt: entry ? entry.startedAt : null,
    uptimeSeconds: entry ? Math.floor((Date.now() - entry.startedAt) / 1000) : bot.uptime_seconds,
  });
});

// ─── Admin Routes ──────────────────────────────────────────────────────────────
app.get("/admin/stats", requireOwner, (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
  const totalBots = db.prepare("SELECT COUNT(*) as cnt FROM bots").get();
  const planBreakdown = db.prepare("SELECT plan, COUNT(*) as cnt FROM users GROUP BY plan").all();
  const recentUsers = db.prepare("SELECT id, username, email, plan, credits, created_at FROM users ORDER BY created_at DESC LIMIT 10").all();
  const recentBots = db.prepare("SELECT b.*, u.username FROM bots b JOIN users u ON b.user_id=u.id ORDER BY b.created_at DESC LIMIT 20").all();
  res.json({
    stats: { totalUsers: totalUsers.cnt, totalBots: totalBots.cnt, runningBots: runningProcesses.size },
    planBreakdown, recentUsers, recentBots
  });
});

app.get("/admin/users", requireOwner, (req, res) => {
  const users = db.prepare("SELECT u.id, u.username, u.email, u.plan, u.credits, u.created_at, (SELECT COUNT(*) FROM bots WHERE user_id=u.id) as bot_count FROM users u ORDER BY created_at DESC").all();
  res.json(users);
});

app.get("/admin/bots", requireOwner, (req, res) => {
  const bots = db.prepare("SELECT b.*, u.username FROM bots b JOIN users u ON b.user_id=u.id ORDER BY b.created_at DESC").all();
  res.json(bots.map(b => ({ ...b, isRunning: runningProcesses.has(b.id) })));
});

app.patch("/admin/users/:user_id/plan", requireOwner, (req, res) => {
  const { user_id } = req.params;
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan" });
  db.prepare("UPDATE users SET plan=?, updated_at=strftime('%s','now') WHERE id=?").run(plan, user_id);
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
  if (!stopBotProcess(id, "admin stop")) return res.status(409).json({ error: "Bot is not running" });
  db.prepare("UPDATE bots SET status='stopped', updated_at=strftime('%s','now') WHERE id=?").run(id);
  res.json({ success: true });
});

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ name: "Sutra Hosting API", status: "online", version: "2.2.0", runningBots: runningProcesses.size });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Sutra Hosting API running on http://localhost:${PORT}`);
  console.log(`👑 Owner username: ${OWNER_USERNAME}`);
  console.log(`📦 Database: ${DB_PATH}\n`);
});
