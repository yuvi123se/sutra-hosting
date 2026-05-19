import express from "express";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import fetch from "node-fetch";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const OWNER_ID = process.env.OWNER_ID || "1304126568817229875";

// ─── Database Setup ───────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, "endercloud.db"));

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
    runtime TEXT DEFAULT 'nodejs',
    country TEXT DEFAULT 'india',
    status TEXT DEFAULT 'stopped',
    ram_mb INTEGER DEFAULT 256,
    cpu_limit INTEGER DEFAULT 10,
    uptime_seconds INTEGER DEFAULT 0,
    restart_count INTEGER DEFAULT 0,
    plan TEXT DEFAULT 'free',
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
`);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "endercloud_secret_dev",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function requireOwner(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.session.user.discord_id !== OWNER_ID) return res.status(403).json({ error: "Forbidden: Owner only" });
  next();
}

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

app.get("/auth/discord/callback", async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!code) return res.redirect(`${frontendUrl}/?error=no_code`);

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("No access token");

    // Fetch user from Discord
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    // Upsert user in DB
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

    const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discordUser.id);

    // Log session
    db.prepare("INSERT INTO sessions_log (discord_id, action, ip) VALUES (?, 'login', ?)")
      .run(discordUser.id, req.ip);

    req.session.user = user;
    req.session.discordToken = tokenData.access_token;

    res.redirect(`${frontendUrl}/dashboard`);
  } catch (err) {
    console.error("OAuth error:", err);
    res.redirect(`${frontendUrl}/?error=auth_failed`);
  }
});

app.post("/auth/logout", requireAuth, (req, res) => {
  db.prepare("INSERT INTO sessions_log (discord_id, action, ip) VALUES (?, 'logout', ?)")
    .run(req.session.user.discord_id, req.ip);
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/auth/me", (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(req.session.user.discord_id);
  res.json({ user, isOwner: user?.discord_id === OWNER_ID });
});

// ─── Plan Config ───────────────────────────────────────────────────────────────
const PLANS = {
  free: {
    name: "Free",
    maxBots: 1,
    ramMb: 256,
    cpuLimit: 10,
    countries: ["india"],
    defaultCountry: "india",
    uptimePercent: "95%",
    price: "Free"
  },
  starter: {
    name: "Starter",
    maxBots: 3,
    ramMb: 512,
    cpuLimit: 25,
    countries: ["india", "singapore", "us-east", "europe"],
    defaultCountry: "india",
    uptimePercent: "99%",
    price: "₹149/mo"
  },
  pro: {
    name: "Pro",
    maxBots: 10,
    ramMb: 1024,
    cpuLimit: 50,
    countries: ["india", "singapore", "us-east", "us-west", "europe", "japan"],
    defaultCountry: "india",
    uptimePercent: "99.9%",
    price: "₹399/mo"
  },
  ultra: {
    name: "Ultra",
    maxBots: -1, // unlimited
    ramMb: 4096,
    cpuLimit: 100,
    countries: ["india", "singapore", "us-east", "us-west", "europe", "japan", "australia", "brazil"],
    defaultCountry: "india",
    uptimePercent: "99.99%",
    price: "₹999/mo"
  }
};

app.get("/plans", (req, res) => {
  res.json(PLANS);
});

// ─── Bot Routes ────────────────────────────────────────────────────────────────
app.get("/bots", requireAuth, (req, res) => {
  const bots = db.prepare("SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.session.user.discord_id);
  res.json(bots);
});

app.post("/bots", requireAuth, (req, res) => {
  const { name, token, runtime, country } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(req.session.user.discord_id);
  const plan = PLANS[user.plan] || PLANS.free;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: "Bot name must be at least 2 characters" });
  }

  // Check bot limit
  const botCount = db.prepare("SELECT COUNT(*) as cnt FROM bots WHERE user_id = ?").get(user.discord_id);
  if (plan.maxBots !== -1 && botCount.cnt >= plan.maxBots) {
    return res.status(403).json({ error: `Your ${plan.name} plan only allows ${plan.maxBots} bot(s). Upgrade for more!` });
  }

  // Validate country
  const selectedCountry = plan.countries.includes(country) ? country : plan.defaultCountry;

  const botId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO bots (id, user_id, name, token, runtime, country, status, ram_mb, cpu_limit, plan)
    VALUES (?, ?, ?, ?, ?, ?, 'stopped', ?, ?, ?)
  `).run(botId, user.discord_id, name.trim(), token || null, runtime || "nodejs", selectedCountry, plan.ramMb, plan.cpuLimit, user.plan);

  const bot = db.prepare("SELECT * FROM bots WHERE id = ?").get(botId);
  res.json(bot);
});

app.patch("/bots/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.session.user.discord_id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const { name, token, runtime, country, status } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(req.session.user.discord_id);
  const plan = PLANS[user.plan] || PLANS.free;

  const updates = {};
  if (name) updates.name = name.trim();
  if (token !== undefined) updates.token = token;
  if (runtime) updates.runtime = runtime;
  if (country && plan.countries.includes(country)) updates.country = country;
  if (status && ["running", "stopped", "restarting"].includes(status)) {
    updates.status = status;
    if (status === "restarting") updates.restart_count = bot.restart_count + 1;
  }
  updates.updated_at = Math.floor(Date.now() / 1000);

  const sets = Object.keys(updates).map(k => `${k}=?`).join(", ");
  db.prepare(`UPDATE bots SET ${sets} WHERE id=?`).run(...Object.values(updates), id);

  const updated = db.prepare("SELECT * FROM bots WHERE id = ?").get(id);
  res.json(updated);
});

app.delete("/bots/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(id, req.session.user.discord_id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  db.prepare("DELETE FROM bots WHERE id = ?").run(id);
  res.json({ success: true });
});

// ─── Admin Routes (Owner Only) ─────────────────────────────────────────────────
app.get("/admin/stats", requireOwner, (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
  const totalBots = db.prepare("SELECT COUNT(*) as cnt FROM bots").get();
  const runningBots = db.prepare("SELECT COUNT(*) as cnt FROM bots WHERE status='running'").get();
  const planBreakdown = db.prepare("SELECT plan, COUNT(*) as cnt FROM users GROUP BY plan").all();
  const recentUsers = db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 10").all();
  const recentBots = db.prepare("SELECT b.*, u.username FROM bots b JOIN users u ON b.user_id=u.discord_id ORDER BY b.created_at DESC LIMIT 20").all();

  res.json({
    stats: {
      totalUsers: totalUsers.cnt,
      totalBots: totalBots.cnt,
      runningBots: runningBots.cnt
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
  res.json(bots);
});

app.patch("/admin/users/:discord_id/plan", requireOwner, (req, res) => {
  const { discord_id } = req.params;
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan" });
  db.prepare("UPDATE users SET plan=?, updated_at=strftime('%s','now') WHERE discord_id=?").run(plan, discord_id);
  res.json({ success: true });
});

app.delete("/admin/bots/:id", requireOwner, (req, res) => {
  db.prepare("DELETE FROM bots WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

app.patch("/admin/bots/:id/status", requireOwner, (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE bots SET status=?, updated_at=strftime('%s','now') WHERE id=?").run(status, req.params.id);
  const bot = db.prepare("SELECT * FROM bots WHERE id=?").get(req.params.id);
  res.json(bot);
});

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ name: "EnderCloud API", status: "online", version: "2.0.0" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 EnderCloud API running on http://localhost:${PORT}`);
  console.log(`👑 Owner ID: ${OWNER_ID}`);
  console.log(`📦 Database: ${path.join(__dirname, "endercloud.db")}\n`);
});
