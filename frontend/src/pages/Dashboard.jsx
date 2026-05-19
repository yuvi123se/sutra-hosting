import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { api, getAvatarUrl, getCountry, timeAgo } from "../api.js";

export default function DashboardPage() {
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [bots, setBots] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.bots(), api.plans()]).then(([b, p]) => {
      setBots(b);
      setPlans(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const plan = plans[user?.plan] || plans.free || {};
  const runningBots = bots.filter(b => b.status === "running").length;
  const avatarUrl = getAvatarUrl(user);

  const planAccent = { free: "#8892b0", starter: "#a5b4fc", pro: "#5865F2", ultra: "#fbbf24" }[user?.plan] || "#8892b0";

  return (
    <div className="main-content" style={{ position: "relative", zIndex: 1 }}>
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {avatarUrl ? (
            <img src={avatarUrl} style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${planAccent}` }} alt="" />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, #5865F2, #7289da)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 700, border: `3px solid ${planAccent}`
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800 }}>
              Hey, {user?.username} 👋
            </h1>
            <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 2 }}>
              Here's what's happening with your bots
            </p>
          </div>
          {isOwner && (
            <div style={{
              marginLeft: "auto",
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 12,
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
              color: "#fbbf24", fontSize: 13, fontWeight: 600
            }}>
              👑 Owner
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: "Total Bots", value: bots.length, icon: "🤖", accent: "#5865F2" },
          { label: "Running", value: runningBots, icon: "✦", accent: "#57F287" },
          { label: "Stopped", value: bots.length - runningBots, icon: "◉", accent: "#8892b0" },
          { label: "Current Plan", value: (user?.plan || "free").charAt(0).toUpperCase() + (user?.plan || "free").slice(1), icon: "✦", accent: planAccent },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="stat-card"
          >
            <div>
              <div className="stat-value" style={{ color: s.accent }}>{loading ? "—" : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
            <div className="stat-icon" style={{ background: `${s.accent}18`, color: s.accent, fontSize: 20 }}>
              {s.icon}
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* Recent bots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="section-header">
            <div>
              <div className="section-title">Your Bots</div>
              <div className="section-sub">{bots.length} deployment{bots.length !== 1 ? "s" : ""}</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/bots")}>
              Manage →
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>Loading...</div>
          ) : bots.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
              <div style={{ color: "var(--text2)", marginBottom: 16, fontSize: 14 }}>No bots deployed yet</div>
              <button className="btn btn-primary" onClick={() => navigate("/bots")}>Deploy your first bot</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bots.slice(0, 5).map(bot => {
                const country = getCountry(bot.country);
                return (
                  <div key={bot.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 14,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    transition: "all 0.2s"
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: "rgba(88,101,242,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
                    }}>🤖</div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bot.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text2)" }}>{bot.runtime} · {country.flag} {country.label}</div>
                    </div>
                    <div>
                      <span className={`badge ${bot.status === "running" ? "badge-online" : "badge-offline"}`}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                        {bot.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Plan info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className="card" style={{ border: `1px solid ${planAccent}30`, background: `${planAccent}08` }}>
            <div style={{ fontFamily: "Syne", fontSize: 13, fontWeight: 700, color: planAccent, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
              {user?.plan || "free"} Plan
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Max Bots", value: plan.maxBots === -1 ? "Unlimited" : plan.maxBots },
                { label: "RAM", value: plan.ramMb ? `${plan.ramMb}MB` : "256MB" },
                { label: "CPU Limit", value: plan.cpuLimit ? `${plan.cpuLimit}%` : "10%" },
                { label: "Uptime", value: plan.uptimePercent || "95%" },
                { label: "Regions", value: plan.countries?.length === 1 ? "India only" : `${plan.countries?.length || 1} regions` },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text2)" }}>{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
            {user?.plan !== "ultra" && (
              <button
                className="btn btn-primary w-full"
                style={{ marginTop: 16, justifyContent: "center" }}
                onClick={() => navigate("/plans")}
              >
                Upgrade Plan ↗
              </button>
            )}
          </div>

          {/* Quick actions */}
          <div className="card">
            <div style={{ fontFamily: "Syne", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost w-full" style={{ justifyContent: "flex-start" }} onClick={() => navigate("/bots")}>
                🤖 Deploy new bot
              </button>
              <button className="btn btn-ghost w-full" style={{ justifyContent: "flex-start" }} onClick={() => navigate("/plans")}>
                ✦ View plans
              </button>
              {isOwner && (
                <button className="btn w-full" style={{ justifyContent: "flex-start", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }} onClick={() => navigate("/admin")}>
                  👑 Admin panel
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
