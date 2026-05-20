import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../App.jsx";
import { api, COUNTRIES, RUNTIMES, getCountry, timeAgo, formatUptime } from "../api.js";
import { useToast } from "../Toast.jsx";

// ─── Deploy Modal ──────────────────────────────────────────────────────────────
function DeployModal({ onClose, onCreate, plans, userPlan }) {
  const plan = plans[userPlan] || plans.free || {};
  const [tab, setTab] = React.useState("code");
  const [form, setForm] = React.useState({
    name: "", token: "", code: "", runtime: "nodejs",
    country: plan.defaultCountry || "india"
  });
  const [files, setFiles] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const allowedCountries = plan.countries || ["india"];

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const PLACEHOLDERS = {
    nodejs: `const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.on('ready', () => {
  console.log(\`Logged in as \${client.user.tag}!\`);
});

client.on('messageCreate', msg => {
  if (msg.content === '!ping') msg.reply('Pong!');
});

client.login(process.env.TOKEN);`,
    python: `import discord
import os

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')

@client.event
async def on_message(message):
    if message.content == '!ping':
        await message.channel.send('Pong!')

client.run(os.environ['TOKEN'])`,
    java: `// Java Discord bot (JDA)\n// Add your main class here`,
    go: `// Go Discord bot\n// Add your main.go here`,
  };

  async function submit() {
    if (!form.name.trim()) return;
    if (tab === "code" && !form.code.trim()) return;
    if (tab === "files" && files.length === 0) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (tab === "token") payload.code = "";
      if (tab === "code") payload.token = "";
      if (tab === "files") {
        // Read all files and combine into code payload
        const fileContents = await Promise.all(files.map(f => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(`// === ${f.name} ===\n${e.target.result}`);
          reader.onerror = reject;
          reader.readAsText(f);
        })));
        payload.code = fileContents.join("\n\n");
      }
      await onCreate(payload);
      onClose();
    } catch (e) {
      setLoading(false);
    }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: "8px 0",
    background: active ? "rgba(88,101,242,0.18)" : "transparent",
    border: active ? "1px solid rgba(88,101,242,0.4)" : "1px solid transparent",
    borderRadius: 10,
    color: active ? "#a5b4fc" : "var(--text2)",
    fontSize: 13, fontWeight: active ? 700 : 500,
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ maxWidth: 560, width: "95%" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800 }}>Deploy New Bot</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 12 }}>
          <button style={tabStyle(tab === "code")} onClick={() => setTab("code")}>📝 Paste Code</button>
          <button style={tabStyle(tab === "files")} onClick={() => setTab("files")}>📁 Upload Files</button>
          <button style={tabStyle(tab === "token")} onClick={() => setTab("token")}>🔑 Token Only</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Bot Name *</label>
            <input className="input" placeholder="e.g. MusicBot, ModBot" value={form.name} onChange={e => set("name", e.target.value)} autoFocus />
          </div>

          <div>
            <label className="label">Runtime</label>
            <select className="input" value={form.runtime} onChange={e => set("runtime", e.target.value)}>
              {RUNTIMES.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
            </select>
          </div>

          {tab === "code" ? (
            <div>
              <label className="label">
                Bot Code *
                <span style={{ marginLeft: 8, color: "var(--text3)", textTransform: "none", letterSpacing: 0, fontSize: 11 }}>
                  Use <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>process.env.TOKEN</code> for your bot token
                </span>
              </label>
              <textarea
                className="input"
                value={form.code}
                onChange={e => set("code", e.target.value)}
                placeholder={PLACEHOLDERS[form.runtime] || "// Paste your bot code here..."}
                rows={12}
                style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontSize: 12, resize: "vertical", lineHeight: 1.6, minHeight: 180 }}
              />
            </div>
          ) : tab === "files" ? (
            <div>
              <label className="label">Bot Files *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files);
                  setFiles(prev => {
                    const names = new Set(prev.map(f => f.name));
                    return [...prev, ...dropped.filter(f => !names.has(f.name))];
                  });
                }}
                style={{
                  border: "2px dashed rgba(88,101,242,0.4)",
                  borderRadius: 12,
                  padding: "28px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "rgba(88,101,242,0.04)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(88,101,242,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(88,101,242,0.04)"}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>Drop files here or click to browse</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Select multiple .js, .py, .ts, .json files etc.</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={e => {
                  const selected = Array.from(e.target.files);
                  setFiles(prev => {
                    const names = new Set(prev.map(f => f.name));
                    return [...prev, ...selected.filter(f => !names.has(f.name))];
                  });
                  e.target.value = "";
                }}
              />
              {files.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "7px 10px", fontSize: 12
                    }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        📄 {f.name}
                      </span>
                      <span style={{ color: "var(--text3)", marginLeft: 8, flexShrink: 0 }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", marginLeft: 8, padding: "0 2px", fontSize: 14, lineHeight: 1 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>
                All files are bundled together and deployed as a single bot project.
              </p>
            </div>
          ) : (
            <div>
              <label className="label">Bot Token <span style={{ color: "var(--text3)", textTransform: "none", letterSpacing: 0 }}>(optional — add later)</span></label>
              <input className="input" type="password" placeholder="Discord bot token" value={form.token} onChange={e => set("token", e.target.value)} />
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>🔒 Stored securely and never exposed in the dashboard</p>
            </div>
          )}

          <div>
            <label className="label">
              Region
              {userPlan === "free" && (
                <span style={{ marginLeft: 8, color: "#fbbf24", textTransform: "none", letterSpacing: 0, fontSize: 11 }}>⚠ Free plan: India only</span>
              )}
            </label>
            <select className="input" value={form.country} onChange={e => set("country", e.target.value)} disabled={allowedCountries.length === 1}>
              {COUNTRIES.filter(c => allowedCountries.includes(c.id)).map(c => (
                <option key={c.id} value={c.id}>{c.flag} {c.label} ({c.region})</option>
              ))}
            </select>
            {allowedCountries.length === 1 && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>Upgrade to unlock more regions</p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, justifyContent: "center" }}
            onClick={submit}
            disabled={loading || !form.name.trim() || (tab === "code" && !form.code.trim()) || (tab === "files" && files.length === 0)}
          >
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "🚀 Deploy Bot"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ bot, onClose, onSave, plans, userPlan }) {
  const plan = plans[userPlan] || plans.free || {};
  const [form, setForm] = React.useState({
    name: bot.name || "",
    token: bot.token || "",
    code: bot.code || "",
    runtime: bot.runtime || "nodejs",
    country: bot.country || plan.defaultCountry || "india",
  });
  const [loading, setLoading] = React.useState(false);
  const allowedCountries = plan.countries || ["india"];

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onSave(bot.id, form);
      onClose();
    } catch (e) {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ maxWidth: 560, width: "95%" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800 }}>Edit Bot</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Bot Name *</label>
            <input className="input" placeholder="Bot name" value={form.name} onChange={e => set("name", e.target.value)} autoFocus />
          </div>

          <div>
            <label className="label">Runtime</label>
            <select className="input" value={form.runtime} onChange={e => set("runtime", e.target.value)}>
              {RUNTIMES.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">
              Bot Code
              <span style={{ marginLeft: 8, color: "var(--text3)", textTransform: "none", letterSpacing: 0, fontSize: 11 }}>
                Use <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>process.env.TOKEN</code> for bot token
              </span>
            </label>
            <textarea
              className="input"
              value={form.code}
              onChange={e => set("code", e.target.value)}
              placeholder="// Paste your bot code here..."
              rows={10}
              style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontSize: 12, resize: "vertical", lineHeight: 1.6, minHeight: 150 }}
            />
          </div>

          <div>
            <label className="label">Bot Token <span style={{ color: "var(--text3)", textTransform: "none", letterSpacing: 0 }}>(leave blank to keep existing)</span></label>
            <input className="input" type="password" placeholder="Discord bot token" value={form.token} onChange={e => set("token", e.target.value)} />
          </div>

          <div>
            <label className="label">Region</label>
            <select className="input" value={form.country} onChange={e => set("country", e.target.value)} disabled={allowedCountries.length === 1}>
              {COUNTRIES.filter(c => allowedCountries.includes(c.id)).map(c => (
                <option key={c.id} value={c.id}>{c.flag} {c.label} ({c.region})</option>
              ))}
            </select>
          </div>
        </div>

        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
          ⚠ Saving will stop the bot if it's currently running. Restart it manually after saving.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, justifyContent: "center" }}
            onClick={submit}
            disabled={loading || !form.name.trim()}
          >
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "💾 Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Logs Modal ────────────────────────────────────────────────────────────────
function LogsModal({ bot, onClose }) {
  const [logs, setLogs] = React.useState([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);

  async function fetchLogs() {
    try {
      const data = await api.botLogs(bot.id);
      setLogs(data.logs || []);
      setIsRunning(data.isRunning || false);
    } catch (_) {}
    setLoading(false);
  }

  React.useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 3000);
    return () => clearInterval(intervalRef.current);
  }, [bot.id]);

  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const streamColor = { stdout: "var(--text)", stderr: "#ED4245", system: "#fbbf24" };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ maxWidth: 680, width: "95%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 800 }}>📋 Logs — {bot.name}</h2>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
              <span style={{ color: isRunning ? "#57F287" : "var(--text3)" }}>
                {isRunning ? "● Live" : "○ Stopped"}
              </span>
              {isRunning && <span style={{ marginLeft: 8, color: "var(--text3)" }}>Auto-refreshes every 3s</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{
          flex: 1, overflowY: "auto", background: "#020408",
          border: "1px solid var(--border)", borderRadius: 12,
          padding: "14px 16px", minHeight: 200, maxHeight: 420,
          fontFamily: "'Fira Code', 'Cascadia Code', monospace", fontSize: 12, lineHeight: 1.7
        }}>
          {loading ? (
            <div style={{ color: "var(--text3)", textAlign: "center", padding: 20 }}>Loading logs...</div>
          ) : logs.length === 0 ? (
            <div style={{ color: "var(--text3)", textAlign: "center", padding: 20 }}>No logs yet. Start the bot to see output here.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ color: streamColor[log.stream] || "var(--text)", marginBottom: 2, wordBreak: "break-all" }}>
                <span style={{ color: "var(--text3)", marginRight: 8, userSelect: "none" }}>
                  {new Date(log.created_at * 1000).toLocaleTimeString()}
                </span>
                {log.line}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={fetchLogs}>↻ Refresh</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Bot Card ─────────────────────────────────────────────────────────────────
function BotCard({ bot, onEdit, onDelete, onStart, onStop, onRestart, onLogs, actionLoading }) {
  const country = getCountry(bot.country);
  const runtime = bot.runtime || "nodejs";
  const isRunning = bot.status === "running";
  const isBusy = actionLoading === bot.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        background: "var(--surface)",
        border: `1px solid ${isRunning ? "rgba(87,242,135,0.2)" : "var(--border)"}`,
        borderRadius: 20,
        padding: "20px 22px",
        transition: "border-color 0.3s",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: isRunning ? "rgba(87,242,135,0.1)" : "rgba(88,101,242,0.1)",
          border: `1px solid ${isRunning ? "rgba(87,242,135,0.2)" : "rgba(88,101,242,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
        }}>🤖</div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bot.name}</div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
            {RUNTIMES.find(r => r.id === runtime)?.icon} {runtime} · {country.flag} {country.label}
          </div>
        </div>
        <span className={`badge ${isRunning ? "badge-online" : "badge-offline"}`} style={{ flexShrink: 0 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
          {bot.status}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>RAM</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{bot.ram_mb}MB</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>CPU</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{bot.cpu_limit}%</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Uptime</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{formatUptime(bot.uptime_seconds)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Restarts</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{bot.restart_count || 0}</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Created</div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>{timeAgo(bot.created_at)}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!isRunning ? (
          <button
            className="btn btn-success btn-sm"
            onClick={() => onStart(bot.id)}
            disabled={isBusy}
            style={{ flex: 1, justifyContent: "center", minWidth: 72 }}
          >
            {isBusy ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "▶ Start"}
          </button>
        ) : (
          <>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onStop(bot.id)}
              disabled={isBusy}
              style={{ flex: 1, justifyContent: "center", minWidth: 72 }}
            >
              {isBusy ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "■ Stop"}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => onRestart(bot.id)}
              disabled={isBusy}
              style={{ background: "rgba(254,231,92,0.1)", border: "1px solid rgba(254,231,92,0.2)", color: "#FEE75C", flex: 1, justifyContent: "center", minWidth: 72 }}
            >
              {isBusy ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "↺ Restart"}
            </button>
          </>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => onLogs(bot)} style={{ flex: 1, justifyContent: "center", minWidth: 72 }}>
          📋 Logs
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(bot)} style={{ justifyContent: "center" }}>
          ✏ Edit
        </button>
        <button
          className="btn btn-sm"
          onClick={() => onDelete(bot.id)}
          style={{ background: "rgba(237,66,69,0.08)", border: "1px solid rgba(237,66,69,0.2)", color: "var(--red)", justifyContent: "center" }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Bots Page ────────────────────────────────────────────────────────────
export default function BotsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [bots, setBots] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDeploy, setShowDeploy] = useState(false);
  const [editBot, setEditBot] = useState(null);
  const [logsBot, setLogsBot] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // botId being acted on

  async function load() {
    try {
      const [b, p] = await Promise.all([api.bots(), api.plans()]);
      setBots(b);
      setPlans(p);
    } catch (e) {
      toast(e.message, "error");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Poll for status updates every 5s
    const interval = setInterval(async () => {
      try {
        const b = await api.bots();
        setBots(b);
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(data) {
    try {
      const bot = await api.createBot(data);
      setBots(prev => [bot, ...prev]);
      toast(`Bot "${bot.name}" deployed! Click Start to run it.`, "success");
    } catch (e) {
      toast(e.message, "error");
      throw e;
    }
  }

  async function handleSave(id, data) {
    try {
      const updated = await api.updateBot(id, data);
      setBots(prev => prev.map(b => b.id === id ? updated : b));
      toast("Bot updated successfully", "success");
    } catch (e) {
      toast(e.message, "error");
      throw e;
    }
  }

  async function handleDelete(id) {
    const bot = bots.find(b => b.id === id);
    if (!confirm(`Delete "${bot?.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteBot(id);
      setBots(prev => prev.filter(b => b.id !== id));
      toast("Bot deleted", "info");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function handleStart(id) {
    setActionLoading(id);
    try {
      const { bot } = await api.startBot(id);
      setBots(prev => prev.map(b => b.id === id ? { ...b, ...bot } : b));
      toast("Bot started!", "success");
    } catch (e) {
      toast(e.message, "error");
    }
    setActionLoading(null);
  }

  async function handleStop(id) {
    setActionLoading(id);
    try {
      const { bot } = await api.stopBot(id);
      setBots(prev => prev.map(b => b.id === id ? { ...b, ...bot } : b));
      toast("Bot stopped", "info");
    } catch (e) {
      toast(e.message, "error");
    }
    setActionLoading(null);
  }

  async function handleRestart(id) {
    setActionLoading(id);
    try {
      const { bot } = await api.restartBot(id);
      setBots(prev => prev.map(b => b.id === id ? { ...b, ...bot } : b));
      toast("Bot restarted!", "success");
    } catch (e) {
      toast(e.message, "error");
    }
    setActionLoading(null);
  }

  const plan = plans[user?.plan] || plans.free || {};
  const canAddMore = plan.maxBots === -1 || bots.length < (plan.maxBots || 1);
  const runningCount = bots.filter(b => b.status === "running").length;

  return (
    <div className="main-content" style={{ position: "relative", zIndex: 1 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800 }}>My Bots</h1>
            <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 2 }}>
              {bots.length} bot{bots.length !== 1 ? "s" : ""} · {runningCount} running
              {plan.maxBots !== -1 && (
                <span style={{ marginLeft: 8, color: "var(--text3)" }}>
                  ({bots.length}/{plan.maxBots} slots used)
                </span>
              )}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => canAddMore ? setShowDeploy(true) : toast(`Upgrade your plan to add more bots (limit: ${plan.maxBots})`, "error")}
          >
            🚀 Deploy Bot
          </button>
        </div>
      </motion.div>

      {/* Bot grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div className="spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
          <div style={{ color: "var(--text3)", fontSize: 14 }}>Loading bots...</div>
        </div>
      ) : bots.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "60px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24 }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
          <div style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No bots yet</div>
          <div style={{ color: "var(--text2)", fontSize: 14, marginBottom: 24 }}>
            Deploy your first Discord bot to get started. It only takes 30 seconds.
          </div>
          <button className="btn btn-primary" onClick={() => setShowDeploy(true)}>
            🚀 Deploy your first bot
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {bots.map(bot => (
              <BotCard
                key={bot.id}
                bot={bot}
                onEdit={setEditBot}
                onDelete={handleDelete}
                onStart={handleStart}
                onStop={handleStop}
                onRestart={handleRestart}
                onLogs={setLogsBot}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showDeploy && (
          <DeployModal
            onClose={() => setShowDeploy(false)}
            onCreate={handleCreate}
            plans={plans}
            userPlan={user?.plan || "free"}
          />
        )}
        {editBot && (
          <EditModal
            bot={editBot}
            onClose={() => setEditBot(null)}
            onSave={handleSave}
            plans={plans}
            userPlan={user?.plan || "free"}
          />
        )}
        {logsBot && (
          <LogsModal bot={logsBot} onClose={() => setLogsBot(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
