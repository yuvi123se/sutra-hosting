import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { spawn, execSync } from "child_process";
import fs from "fs";
import os from "os";
import multer from "multer";

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
  "ALTER TABLE bots ADD COLUMN archived INTEGER DEFAULT 0",
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

// ─── File Upload (multer) ──────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const ok = /\.(tar\.gz|tgz|zip)$/i.test(file.originalname) ||
               file.mimetype === "application/gzip" ||
               file.mimetype === "application/x-tar" ||
               file.mimetype === "application/zip";
    cb(ok ? null : new Error("Only .tar.gz, .tgz, or .zip archives are accepted"), ok);
  },
});

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
const MAX_RESTARTS = 5;
const RESTART_BACKOFF_MS = [2000, 5000, 10000, 30000, 60000];

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
  const trimmed = String(line).slice(0, 2000);
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

// Detect which npm packages the bot code actually requires
function detectRequiredPackages(code) {
  const matches = [...code.matchAll(/require\(\s*['"]([^./\s'"@][^'"]*)['"]\s*\)/g)];
  const importMatches = [...code.matchAll(/^import\s+.*?\s+from\s+['"]([^./\s'"@][^'"]*)['"]/gm)];
  const all = new Set([
    ...matches.map(m => m[1].split("/")[0]),
    ...importMatches.map(m => m[1].split("/")[0]),
  ]);
  // Strip known Node.js built-ins
  const builtins = new Set([
    "fs","path","os","http","https","crypto","events","stream","util",
    "child_process","buffer","url","net","tls","dns","readline","assert",
    "zlib","timers","string_decoder","querystring","punycode","cluster",
    "worker_threads","perf_hooks","v8","vm","module","process",
  ]);
  return [...all].filter(p => !builtins.has(p));
}

// Install npm deps into the bot's temp dir, returns error string or null
async function installDeps(botDir, packages) {
  if (!packages.length) return null;
  return new Promise((resolve) => {
    const pkgJson = {
      name: "sutra-bot",
      version: "1.0.0",
      type: "commonjs",
      dependencies: Object.fromEntries(packages.map(p => [p, "latest"])),
    };
    fs.writeFileSync(path.join(botDir, "package.json"), JSON.stringify(pkgJson, null, 2));

    appendLog("_install_", `[sutra] Installing: ${packages.join(", ")}`, "system");
    const npm = spawn("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund", "--loglevel=error"], {
      cwd: botDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    npm.stderr.on("data", d => { stderr += d.toString(); });
    npm.on("close", code => {
      resolve(code === 0 ? null : `npm install failed: ${stderr.slice(0, 500)}`);
    });
    npm.on("error", err => resolve(`npm spawn error: ${err.message}`));
  });
}

async function spawnBotProcess(bot, botDir, restartCount = 0) {
  const { cmd, ext, args = [] } = getRuntimeCmd(bot.runtime);
  const codeFile = path.join(botDir, `bot${ext}`);
  const code = bot.code || `console.log('Bot ${bot.name} started (token-only mode)');`;
  fs.writeFileSync(codeFile, code, "utf8");

  // Install dependencies for Node.js bots
  if (bot.runtime === "nodejs" || !bot.runtime) {
    const packages = detectRequiredPackages(code);
    if (packages.length) {
      appendLog(bot.id, `[sutra] Detected packages: ${packages.join(", ")}`, "system");
      const err = await installDeps(botDir, packages);
      if (err) {
        appendLog(bot.id, `[sutra] Dependency install failed: ${err}`, "stderr");
        return { ok: false, error: err };
      }
      appendLog(bot.id, `[sutra] Dependencies installed successfully`, "system");
    }
  }

  // Java compile step
  if (bot.runtime === "java") {
    try {
      const { execSync } = await import("child_process");
      execSync(`javac "${codeFile}"`, { cwd: botDir });
    } catch (e) {
      return { ok: false, error: `Java compile error: ${e.message}` };
    }
  }

  const botEnv = {
    ...process.env,
    TOKEN: bot.token || "",
    BOT_ID: bot.id,
    BOT_NAME: bot.name,
  };

  let spawnArgs;
  if (bot.runtime === "java") {
    const className = path.basename(codeFile, ".java");
    spawnArgs = ["-cp", botDir, className];
  } else if (bot.runtime === "go") {
    spawnArgs = [...args, codeFile];
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
    return { ok: false, error: `Failed to spawn process: ${e.message}` };
  }

  return { ok: true, proc };
}

async function startBotProcess(bot) {
  if (runningProcesses.has(bot.id)) return { ok: false, error: "Bot is already running" };
  if (!bot.code && !bot.token) return { ok: false, error: "Bot has no code or token to run" };

  const botDir = path.join(os.tmpdir(), `sutra-bot-${bot.id}`);
  fs.mkdirSync(botDir, { recursive: true });

  let restartCount = 0;
  let manualStop = false;

  async function launch() {
    const result = await spawnBotProcess(bot, botDir, restartCount);
    if (!result.ok) {
      try { fs.rmSync(botDir, { recursive: true, force: true }); } catch (_) {}
      db.prepare("UPDATE bots SET status='stopped', updated_at=strftime('%s','now') WHERE id=?").run(bot.id);
      return result;
    }

    const { proc } = result;
    const startedAt = Date.now();

    proc.stdout.on("data", (data) => {
      data.toString().split("\n").filter(Boolean).forEach(line => appendLog(bot.id, line));
    });
    proc.stderr.on("data", (data) => {
      data.toString().split("\n").filter(Boolean).forEach(line => appendLog(bot.id, line, "stderr"));
    });
    proc.on("error", (err) => appendLog(bot.id, `[sutra] Process error: ${err.message}`, "stderr"));

    proc.on("exit", (exitCode, signal) => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      try {
        db.prepare("UPDATE bots SET uptime_seconds=uptime_seconds+? WHERE id=?").run(elapsed, bot.id);
      } catch (_) {}

      appendLog(bot.id, `[sutra] Process exited (code=${exitCode}, signal=${signal})`, "system");

      if (manualStop || signal === "SIGTERM" || signal === "SIGKILL") {
        runningProcesses.delete(bot.id);
        try { fs.rmSync(botDir, { recursive: true, force: true }); } catch (_) {}
        db.prepare("UPDATE bots SET status='stopped', updated_at=strftime('%s','now') WHERE id=?").run(bot.id);
        return;
      }

      // Auto-restart with backoff
      if (restartCount < MAX_RESTARTS) {
        const delay = RESTART_BACKOFF_MS[restartCount] ?? 60000;
        restartCount++;
        db.prepare("UPDATE bots SET restart_count=restart_count+1, status='restarting', updated_at=strftime('%s','now') WHERE id=?").run(bot.id);
        appendLog(bot.id, `[sutra] Restarting in ${delay / 1000}s... (attempt ${restartCount}/${MAX_RESTARTS})`, "system");

        // Update the entry so stopBotProcess still works during backoff
        const entry = runningProcesses.get(bot.id);
        if (entry) entry.restartTimer = setTimeout(async () => {
          if (!runningProcesses.has(bot.id)) return; // was stopped during backoff
          const r = await launch();
          if (r && !r.ok) {
            appendLog(bot.id, `[sutra] Restart failed: ${r.error}`, "stderr");
            runningProcesses.delete(bot.id);
          }
        }, delay);
      } else {
        runningProcesses.delete(bot.id);
        try { fs.rmSync(botDir, { recursive: true, force: true }); } catch (_) {}
        db.prepare("UPDATE bots SET status='stopped', updated_at=strftime('%s','now') WHERE id=?").run(bot.id);
        appendLog(bot.id, `[sutra] Max restarts (${MAX_RESTARTS}) reached. Bot stopped.`, "system");
      }
    });

    // Update entry with new process
    const existing = runningProcesses.get(bot.id);
    if (existing?.restartTimer) clearTimeout(existing.restartTimer);
    runningProcesses.set(bot.id, { process: proc, startedAt, dir: botDir, manualStop: () => { manualStop = true; } });

    db.prepare("UPDATE bots SET status='running', last_started=?, updated_at=strftime('%s','now') WHERE id=?")
      .run(Math.floor(startedAt / 1000), bot.id);
    appendLog(bot.id, `[sutra] Bot "${bot.name}" started (runtime=${bot.runtime || "nodejs"}, restarts=${restartCount})`, "system");
    return { ok: true };
  }

  // Set a placeholder entry immediately so stopBotProcess can cancel pending restarts
  runningProcesses.set(bot.id, { process: null, startedAt: Date.now(), dir: botDir, manualStop: () => { manualStop = true; } });
  const result = await launch();
  if (result && !result.ok) {
    runningProcesses.delete(bot.id);
    return result;
  }
  return { ok: true };
}

function stopBotProcess(botId, reason = "user request") {
  const entry = runningProcesses.get(botId);
  if (!entry) return false;
  appendLog(botId, `[sutra] Stopping bot (reason: ${reason})`, "system");

  // Signal the restart loop not to re-launch
  if (typeof entry.manualStop === "function") entry.manualStop();
  // Cancel any pending restart timer
  if (entry.restartTimer) clearTimeout(entry.restartTimer);

  try {
    if (entry.process) {
      entry.process.kill("SIGTERM");
      setTimeout(() => { try { entry.process?.kill("SIGKILL"); } catch (_) {} }, 5000);
    }
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

app.post("/bots/:id/archive", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  if (runningProcesses.has(id)) stopBotProcess(id, "bot archived");
  db.prepare("UPDATE bots SET archived=1, status='stopped', updated_at=strftime('%s','now') WHERE id=?").run(id);
  res.json({ success: true, bot: db.prepare("SELECT * FROM bots WHERE id = ?").get(id) });
});

app.post("/bots/:id/unarchive", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.userId);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  db.prepare("UPDATE bots SET archived=0, updated_at=strftime('%s','now') WHERE id=?").run(id);
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

// ─── Archive Upload Route ──────────────────────────────────────────────────────
// POST /bots/upload — create a bot from a .tar.gz / .tgz / .zip archive
// Multipart fields: name, token (opt), runtime (opt), country (opt), file (the archive)
app.post("/bots/upload", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No archive file provided" });

    const { name, token, runtime, country } = req.body;
    if (!name || name.trim().length < 2)
      return res.status(400).json({ error: "Bot name must be at least 2 characters" });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = PLANS[user.plan] || PLANS.free;

    const botCount = db.prepare("SELECT COUNT(*) as cnt FROM bots WHERE user_id = ?").get(user.id);
    if (plan.maxBots !== -1 && botCount.cnt >= plan.maxBots)
      return res.status(403).json({ error: `Your ${plan.name} plan allows only ${plan.maxBots} bot(s). Upgrade for more!` });

    // Extract archive to a temp dir, read all text files into code
    const extractDir = path.join(os.tmpdir(), `sutra-upload-${crypto.randomUUID()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      const archivePath = path.join(extractDir, req.file.originalname);
      fs.writeFileSync(archivePath, req.file.buffer);

      const filename = req.file.originalname.toLowerCase();
      if (filename.endsWith(".zip")) {
        execSync(`unzip -q "${archivePath}" -d "${extractDir}"`);
      } else {
        // .tar.gz or .tgz
        execSync(`tar -xzf "${archivePath}" -C "${extractDir}"`);
      }
      fs.rmSync(archivePath); // remove the raw archive

      // Walk extracted files, collect all readable text files (skip node_modules, .git, binaries)
      const TEXT_EXTS = new Set([".js", ".mjs", ".cjs", ".ts", ".py", ".go", ".java", ".json", ".env", ".txt", ".md", ".sh", ".yaml", ".yml", ".toml"]);
      const SKIP_DIRS = new Set(["node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build"]);

      function walkFiles(dir, rootDir = dir) {
        const result = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) result.push(...walkFiles(path.join(dir, entry.name), rootDir));
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (TEXT_EXTS.has(ext)) {
              result.push(path.join(dir, entry.name));
            }
          }
        }
        return result;
      }

      const textFiles = walkFiles(extractDir);
      if (textFiles.length === 0) {
        fs.rmSync(extractDir, { recursive: true, force: true });
        return res.status(400).json({ error: "No recognized source files found in archive (.js, .py, .ts, .go, .java etc.)" });
      }

      const codeChunks = textFiles.map(fp => {
        const rel = path.relative(extractDir, fp);
        const content = fs.readFileSync(fp, "utf8");
        return `// === ${rel} ===\n${content}`;
      });
      const code = codeChunks.join("\n\n");

      fs.rmSync(extractDir, { recursive: true, force: true });

      const selectedCountry = plan.countries.includes(country) ? country : plan.defaultCountry;
      const botId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO bots (id, user_id, name, token, code, runtime, country, status, ram_mb, cpu_limit, plan)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?)
      `).run(botId, user.id, name.trim(), token || null, code, runtime || "nodejs", selectedCountry, plan.ramMb, plan.cpuLimit, user.plan);

      res.json(db.prepare("SELECT * FROM bots WHERE id = ?").get(botId));
    } catch (e) {
      try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (_) {}
      console.error("Upload extract error:", e.message);
      res.status(500).json({ error: `Failed to extract archive: ${e.message}` });
    }
  });
});
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
