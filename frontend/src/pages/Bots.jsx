import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../App.jsx";
import { api, COUNTRIES, RUNTIMES, getCountry, timeAgo } from "../api.js";
import { useToast } from "../Toast.jsx";

function DeployModal({ onClose, onCreate, plans, userPlan }) {
  const plan = plans[userPlan] || plans.free || {};
  const [tab, setTab] = React.useState("code"); // "token" | "code"
  const [form, setForm] = React.useState({
    name: "", token: "", code: "", runtime: "nodejs",
    country: plan.defaultCountry || "india"
  });
  const [loading, setLoading] = React.useState(false);
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
    java: `// Java Discord bot (JDA)
// Add your main class here`,
    go: `// Go Discord bot
// Add your main.go here`,
  };

  async function submit() {
    if (!form.name.trim()) return;
    if (tab === "code" && !form.code.trim()) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (tab === "token") payload.code = "";
      if (tab === "code") payload.token = "";
      await onCreate(payload);
      onClose();
    } catch (e) {
      setLoading(false);
    }
  }

  const tabStyle = (active) => ({
    flex: 1,
    padding: "8px 0",
    background: active ? "rgba(88,101,242,0.18)" : "transparent",
    border: active ? "1px solid rgba(88,101,242,0.4)" : "1px solid transparent",
    borderRadius: 10,
    color: active ? "#a5b4fc" : "var(--text2)",
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    transition: "all 0.15s",
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

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 12 }}>
          <button style={tabStyle(tab === "code")} onClick={() => setTab("code")}>
            📝 Paste Code
          </button>
          <button style={tabStyle(tab === "token")} onClick={() => setTab("token")}>
            🔑 Token Only
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Bot Name *</label>
            <input
              className="input"
              placeholder="e.g. MusicBot, ModBot"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Runtime</label>
            <select className="input" value={form.runtime} onChange={e => set("runtime", e.target.value)}>
              {RUNTIMES.map(r => (
                <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
              ))}
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
                style={{
                  fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                  fontSize: 12,
                  resize: "vertical",
                  lineHeight: 1.6,
                  minHeight: 180,
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <div>
                  <label className="label" style={{ marginBottom: 4 }}>Bot Token</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Discord bot token (injected as TOKEN env var)"
                    value={form.token}
                    onChange={e => set("token", e.target.value)}
                  />
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>
                🔒 Token stored securely — injected as <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 4px", borderRadius: 3 }}>TOKEN</code> environment variable at runtime
              </p>
            </div>
          ) : (
            <div>
              <label className="label">Bot Token <span style={{ color: "var(--text3)", textTransform: "none", letterSpacing: 0 }}>(optional — add later)</span></label>
              <input
                className="input"
                type="password"
                placeholder="Discord bot token"
                value={form.token}
                onChange={e => set("token", e.target.value)}
              />
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>
                🔒 Stored securely and never exposed in the dashboard
              </p>
            </div>
          )}

          <div>
            <label className="label">
              Region
              {userPlan === "free" && (
                <span style={{ marginLeft: 8, color: "#fbbf24", textTransform: "none", letterSpacing: 0, fontSize: 11 }}>
                  ⚠ Free plan: India only
                </span>
              )}
            </label>
            <select
              className="input"
              value={form.country}
              onChange={e => set("country", e.target.value)}
              disabled={allowedCountries.length === 1}
            >
              {COUNTRIES.filter(c => allowedCountries.includes(c.id)).map(c => (
                <option key={c.id} value={c.id}>{c.flag} {c.label} ({c.region})</option>
              ))}
            </select>
            {allowedCountries.length === 1 && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>
                Upgrade to unlock more regions
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, justifyContent: "center" }}
            onClick={submit}
            disabled={loading || !form.name.trim() || (tab === "code" && !form.code.trim())}
          >
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "🚀 Deploy Bot"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EditModal
