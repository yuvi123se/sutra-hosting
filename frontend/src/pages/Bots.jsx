import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../App.jsx";
import { api, COUNTRIES, RUNTIMES, getCountry, timeAgo } from "../api.js";
import { useToast } from "../Toast.jsx";

function DeployModal({ onClose, onCreate, plans, userPlan }) {
  const plan = plans[userPlan] || plans.free || {};
  const [form, setForm] = useState({
    name: "", token: "", runtime: "nodejs",
    country: plan.defaultCountry || "india"
  });
  const [loading, setLoading] = useState(false);
  const allowedCountries = plan.countries || ["india"];

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onCreate(form);
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
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800 }}>Deploy New Bot</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

          <div>
            <label className="label">Runtime</label>
            <select className="input" value={form.runtime} onChange={e => set("runtime", e.target.value)}>
              {RUNTIMES.map(r => (
                <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
              ))}
            </select>
          </div>

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
            disabled={loading || !form.name.trim()}
          >
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "🚀 Deploy Bot"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EditModal({ bot, onClose, onSave, plans, userPlan }) {
  const plan = plans[userPlan] || plans.free || {};
  const allowedCountries = plan.countries || ["india"];
  const [form, setForm] = useState({
    name: bot.name, token: "", runtime: bot.runtime, country: bot.country
  });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    setLoading(true);
    try {
      await onSave(bot.id, form);
      onClose();
    } catch { setLoading(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800 }}>Edit {bot.name}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">Bot Name</label>
            <input className="input" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label">New Token <span style={{ color: "var(--text3)", textTransform: "none", fontSize: 11 }}>(leave blank to keep current)</span></label>
            <input className="input" type="password" placeholder="New token (optional)" value={form.token} onChange={e => set("token", e.target.value)} />
          </div>
          <div>
            <label className="label">Runtime</label>
            <select className="input" value={form.runtime} onChange={e => set("runtime", e.target.value)}>
              {RUNTIMES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Region</label>
            <select className="input" value={form.country} onChange={e => set("country", e.target.value)} disabled={allowedCountries.length === 1}>
              {COUNTRIES.filter(c => allowedCountries.includes(c.id)).map(c => (
                <option key={c.id} value={c.id}>{c.flag} {c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2, justifyContent: "center" }} onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function BotsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [bots, setBots] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDeploy, setShowDeploy] = useState(false);
  const [editBot, setEditBot] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionId, setActionId] = useState(null);

  const [userPlan, setUserPlan] = useState(user?.plan || "free");
  const plan = plans[userPlan] || {};

  useEffect(() => {
    Promise.all([api.bots(), api.plans(), api.me()]).then(([b, p, me]) => {
      setBots(b);
      setPlans(p);
      if (me?.user?.plan) setUserPlan(me.user.plan);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function createBot(data) {
    try {
      const bot = await api.createBot(data);
      setBots(b => [bot, ...b]);
      toast(`${bot.name} deployed!`, "success");
    } catch (e) {
      toast(e.message, "error");
      throw e;
    }
  }

  async function updateBot(id, data) {
    try {
      const updated = await api.updateBot(id, data);
      setBots(b => b.map(x => x.id === id ? updated : x));
      toast("Bot updated!", "success");
    } catch (e) {
      toast(e.message, "error");
      throw e;
    }
  }

  async function setStatus(bot, status) {
    setActionId(bot.id);
    try {
      const updated = await api.updateBot(bot.id, { status });
      setBots(b => b.map(x => x.id === bot.id ? updated : x));
      toast(`${bot.name} ${status}`, "success");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setActionId(null);
    }
  }

  async function deleteBot(bot) {
    if (!confirm(`Delete "${bot.name}"? This cannot be undone.`)) return;
    setDeletingId(bot.id);
    try {
      await api.deleteBot(bot.id);
      setBots(b => b.filter(x => x.id !== bot.id));
      toast(`${bot.name} deleted`, "info");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  const maxBots = plan.maxBots === -1 ? Infinity : (plan.maxBots || 1);
  const canAddMore = bots.length < maxBots;

  return (
    <div className="main-content" style={{ position: "relative", zIndex: 1 }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800 }}>My Bots</h1>
            <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 4 }}>
              {bots.length} / {plan.maxBots === -1 ? "∞" : (plan.maxBots || 1)} bots
              <span style={{ marginLeft: 12, padding: "2px 10px", borderRadius: 100, background: "rgba(88,101,242,0.1)", color: "#a5b4fc", fontSize: 11, fontWeight: 600 }}>
                {userPlan} plan
              </span>
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => canAddMore ? setShowDeploy(true) : toast(`Upgrade your plan to add more bots`, "error")}
            style={{ opacity: canAddMore ? 1 : 0.6 }}
          >
            🚀 Deploy Bot
          </button>
        </div>

        {!canAddMore && (
          <div style={{
            padding: "14px 18px", borderRadius: 14, marginBottom: 20,
            background: "rgba(254,231,92,0.08)", border: "1px solid rgba(254,231,92,0.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
          }}>
            <span style={{ color: "#FEE75C", fontSize: 13 }}>
              ⚠ You've reached your {userPlan} plan bot limit ({plan.maxBots} bot{plan.maxBots > 1 ? "s" : ""})
            </span>
            <a href="/plans" style={{ color: "#FEE75C", fontSize: 12, fontWeight: 600, textDecoration: "underline" }}>Upgrade →</a>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text3)" }}>
            <div className="spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
            Loading bots...
          </div>
        ) : bots.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div style={{ fontSize: 56, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>🤖</div>
            <h3 style={{ fontFamily: "Syne", fontSize: 20, marginBottom: 8 }}>No bots yet</h3>
            <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 24 }}>Deploy your first Discord bot and get it online in seconds</p>
            <button className="btn btn-primary btn-lg" onClick={() => setShowDeploy(true)}>🚀 Deploy First Bot</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bots.map((bot, i) => {
              const country = getCountry(bot.country);
              const isActing = actionId === bot.id;
              const isDeleting = deletingId === bot.id;
              return (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 20, padding: "18px 20px",
                    display: "flex", alignItems: "center", gap: 14,
                    flexWrap: "wrap",
                    transition: "border-color 0.2s",
                    opacity: isDeleting ? 0.4 : 1
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: bot.status === "running" ? "rgba(87,242,135,0.1)" : "rgba(88,101,242,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                    border: `1px solid ${bot.status === "running" ? "rgba(87,242,135,0.2)" : "var(--border)"}`
                  }}>🤖</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bot.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
                      {RUNTIMES.find(r => r.id === bot.runtime)?.label || bot.runtime}
                      {" · "}
                      <span title={country.label}>{country.flag} {country.label}</span>
                      {" · "}
                      <span style={{ color: "var(--text3)" }}>added {timeAgo(bot.created_at)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>RAM</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{bot.ram_mb}MB</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>CPU</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{bot.cpu_limit}%</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>Restarts</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{bot.restart_count}</div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`badge ${bot.status === "running" ? "badge-online" : bot.status === "restarting" ? "badge-idle" : "badge-offline"}`}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                    {bot.status}
                  </span>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {bot.status === "running" ? (
                      <button className="btn btn-sm" onClick={() => setStatus(bot, "stopped")} disabled={isActing}
                        style={{ background: "rgba(237,66,69,0.1)", border: "1px solid rgba(237,66,69,0.2)", color: "var(--red)" }}>
                        ⏹ Stop
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-success" onClick={() => setStatus(bot, "running")} disabled={isActing}>
                        ▶ Start
                      </button>
                    )}
                    <button className="btn btn-sm" onClick={() => setStatus(bot, "restarting")} disabled={isActing}
                      style={{ background: "rgba(254,231,92,0.08)", border: "1px solid rgba(254,231,92,0.2)", color: "#FEE75C" }}>
                      ↺
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditBot(bot)}>✎</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteBot(bot)} disabled={isDeleting}>✕</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showDeploy && <DeployModal onClose={() => setShowDeploy(false)} onCreate={createBot} plans={plans} userPlan={userPlan} />}
        {editBot && <EditModal bot={editBot} onClose={() => setEditBot(null)} onSave={updateBot} plans={plans} userPlan={userPlan} />}
      </AnimatePresence>
    </div>
  );
}
