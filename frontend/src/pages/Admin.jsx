import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, getCountry, getAvatarUrl, timeAgo } from "../api.js";
import { useToast } from "../Toast.jsx";

const PLAN_COLORS = { free: "#8892b0", starter: "#a5b4fc", pro: "#5865F2", ultra: "#fbbf24" };

export default function AdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === "overview") {
      api.adminStats().then(d => { setStats(d); setLoading(false); });
    } else if (tab === "users") {
      api.adminUsers().then(u => { setUsers(u); setLoading(false); });
    } else if (tab === "bots") {
      api.adminBots().then(b => { setBots(b); setLoading(false); });
    }
  }, [tab]);

  async function changePlan(discordId, plan) {
    try {
      await api.adminSetPlan(discordId, plan);
      setUsers(u => u.map(x => x.discord_id === discordId ? { ...x, plan } : x));
      toast(`Plan updated to ${plan}`, "success");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function deleteBotAdmin(id) {
    if (!confirm("Delete this bot?")) return;
    try {
      await api.adminDeleteBot(id);
      setBots(b => b.filter(x => x.id !== id));
      toast("Bot deleted", "info");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function setBotStatus(id, status) {
    try {
      const updated = await api.adminSetBotStatus(id, status);
      setBots(b => b.map(x => x.id === id ? { ...x, ...updated } : x));
      toast(`Bot ${status}`, "success");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  const TABS = [
    { id: "overview", label: "📊 Overview" },
    { id: "users", label: "👥 Users" },
    { id: "bots", label: "🤖 All Bots" },
  ];

  return (
    <div className="main-content" style={{ position: "relative", zIndex: 1 }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
          }}>👑</div>
          <div>
            <h1 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800 }}>Admin Panel</h1>
            <p style={{ color: "#fbbf24", fontSize: 13 }}>Owner-only view · EnderCloud</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.id} className="btn"
              style={{
                background: tab === t.id ? "rgba(251,191,36,0.12)" : "var(--surface)",
                border: `1px solid ${tab === t.id ? "rgba(251,191,36,0.3)" : "var(--border)"}`,
                color: tab === t.id ? "#fbbf24" : "var(--text2)",
                fontSize: 13
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div className="spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab === "overview" && stats && (
              <div>
                <div className="grid-4" style={{ marginBottom: 28 }}>
                  {[
                    { label: "Total Users", value: stats.stats.totalUsers, icon: "👥", color: "#5865F2" },
                    { label: "Total Bots", value: stats.stats.totalBots, icon: "🤖", color: "#a5b4fc" },
                    { label: "Running Bots", value: stats.stats.runningBots, icon: "✦", color: "#57F287" },
                    { label: "Stopped Bots", value: stats.stats.totalBots - stats.stats.runningBots, icon: "◉", color: "#8892b0" },
                  ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="stat-card">
                      <div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                      </div>
                      <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color, fontSize: 20 }}>{s.icon}</div>
                    </motion.div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Plan breakdown */}
                  <div className="card">
                    <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Plan Distribution</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {stats.planBreakdown.map(p => (
                        <div key={p.plan} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: PLAN_COLORS[p.plan] || "#8892b0", flexShrink: 0 }} />
                          <span style={{ flex: 1, textTransform: "capitalize", fontSize: 13 }}>{p.plan}</span>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{p.cnt}</span>
                          <div style={{ width: 80, height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 3,
                              background: PLAN_COLORS[p.plan] || "#8892b0",
                              width: `${Math.round(p.cnt / stats.stats.totalUsers * 100)}%`
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent users */}
                  <div className="card">
                    <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Recent Users</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {stats.recentUsers.slice(0, 6).map(u => {
                        const av = getAvatarUrl(u);
                        return (
                          <div key={u.discord_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {av ? (
                              <img src={av} style={{ width: 28, height: 28, borderRadius: "50%" }} alt="" />
                            ) : (
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                                {u.username?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</span>
                            <span style={{ fontSize: 11, color: PLAN_COLORS[u.plan] || "#8892b0", textTransform: "capitalize" }}>{u.plan}</span>
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{timeAgo(u.created_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {tab === "users" && (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", fontFamily: "Syne", fontWeight: 700, fontSize: 16 }}>
                  All Users ({users.length})
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Discord ID</th>
                        <th>Plan</th>
                        <th>Bots</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => {
                        const av = getAvatarUrl(u);
                        return (
                          <tr key={u.discord_id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {av ? (
                                  <img src={av} style={{ width: 28, height: 28, borderRadius: "50%" }} alt="" />
                                ) : (
                                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                                    {u.username?.[0]?.toUpperCase()}
                                  </div>
                                )}
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</span>
                                {u.discord_id === "1304126568817229875" && <span style={{ fontSize: 10, color: "#fbbf24" }}>👑</span>}
                              </div>
                            </td>
                            <td><span style={{ fontSize: 12, color: "var(--text2)", fontFamily: "monospace" }}>{u.discord_id}</span></td>
                            <td>
                              <span className={`badge badge-${u.plan || "free"}`} style={{ textTransform: "capitalize" }}>
                                {u.plan || "free"}
                              </span>
                            </td>
                            <td><span style={{ fontWeight: 600 }}>{u.bot_count}</span></td>
                            <td style={{ color: "var(--text2)", fontSize: 12 }}>{timeAgo(u.created_at)}</td>
                            <td>
                              <select
                                className="input"
                                style={{ width: 110, padding: "5px 8px", fontSize: 12 }}
                                value={u.plan || "free"}
                                onChange={e => changePlan(u.discord_id, e.target.value)}
                              >
                                {["free", "starter", "pro", "ultra"].map(p => (
                                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All Bots */}
            {tab === "bots" && (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", fontFamily: "Syne", fontWeight: 700, fontSize: 16 }}>
                  All Bots ({bots.length})
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Bot</th>
                        <th>Owner</th>
                        <th>Runtime</th>
                        <th>Region</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bots.map(bot => {
                        const country = getCountry(bot.country);
                        return (
                          <tr key={bot.id}>
                            <td><span style={{ fontWeight: 600, fontSize: 13 }}>🤖 {bot.name}</span></td>
                            <td><span style={{ fontSize: 12, color: "var(--text2)" }}>{bot.username}</span></td>
                            <td><span style={{ fontSize: 12 }}>{bot.runtime}</span></td>
                            <td><span style={{ fontSize: 13 }}>{country.flag} {country.label}</span></td>
                            <td>
                              <span className={`badge ${bot.status === "running" ? "badge-online" : "badge-offline"}`}>
                                {bot.status}
                              </span>
                            </td>
                            <td style={{ color: "var(--text2)", fontSize: 12 }}>{timeAgo(bot.created_at)}</td>
                            <td>
                              <div style={{ display: "flex", gap: 5 }}>
                                <button className="btn btn-sm btn-success"
                                  onClick={() => setBotStatus(bot.id, bot.status === "running" ? "stopped" : "running")}
                                  style={{ fontSize: 11 }}>
                                  {bot.status === "running" ? "Stop" : "Start"}
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => deleteBotAdmin(bot.id)} style={{ fontSize: 11 }}>
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
