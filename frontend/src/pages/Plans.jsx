import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../App.jsx";
import { api, COUNTRIES } from "../api.js";
import { useToast } from "../Toast.jsx";

const PLAN_META = {
  free: { accent: "#8892b0", icon: "◉", highlight: false },
  starter: { accent: "#a5b4fc", icon: "✦", highlight: false },
  pro: { accent: "#5865F2", icon: "⬡", highlight: true },
  ultra: { accent: "#fbbf24", icon: "★", highlight: false },
};

export default function PlansPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser(); // always pull fresh plan from server
    api.plans().then(p => { setPlans(p); setLoading(false); });
  }, []);

  function handleSelect(planId) {
    if (planId === user?.plan) return;
    if (planId === "free") {
      toast("You're already on the best free plan!", "info");
      return;
    }
    toast(`Payment integration coming soon! Contact admin to upgrade to ${plans[planId]?.name}.`, "info");
  }

  return (
    <div className="main-content" style={{ position: "relative", zIndex: 1 }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontFamily: "Syne", fontSize: 36, fontWeight: 800, marginBottom: 10 }}>Hosting Plans</h1>
          <p style={{ color: "var(--text2)", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
            Start free with one bot in India, upgrade to unlock more power, more regions, and more bots.
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14,
            padding: "6px 14px", borderRadius: 100,
            background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.2)",
            color: "#a5b4fc", fontSize: 12, fontWeight: 600
          }}>
            Current plan: <strong style={{ textTransform: "capitalize" }}>{user?.plan || "free"}</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, maxWidth: 1100, margin: "0 auto" }}>
            {Object.entries(plans).map(([planId, plan], i) => {
              const meta = PLAN_META[planId] || { accent: "#8892b0", icon: "·", highlight: false };
              const isCurrent = user?.plan === planId || (!user?.plan && planId === "free");
              const allowedCountries = COUNTRIES.filter(c => plan.countries?.includes(c.id));

              return (
                <motion.div
                  key={planId}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    background: meta.highlight ? `rgba(88,101,242,0.06)` : "var(--surface)",
                    border: `1px solid ${isCurrent ? meta.accent + "50" : meta.highlight ? "rgba(88,101,242,0.25)" : "var(--border)"}`,
                    borderRadius: 24,
                    padding: "28px 24px",
                    position: "relative",
                    transition: "all 0.25s",
                    display: "flex", flexDirection: "column"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.3)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  {meta.highlight && (
                    <div style={{
                      position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                      background: "linear-gradient(135deg, #5865F2, #a5b4fc)",
                      color: "#fff", fontSize: 10, fontWeight: 800,
                      padding: "4px 16px", borderRadius: 100, whiteSpace: "nowrap",
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      boxShadow: "0 4px 16px rgba(88,101,242,0.4)"
                    }}>
                      Most Popular
                    </div>
                  )}

                  {isCurrent && (
                    <div style={{
                      position: "absolute", top: -12, right: 20,
                      background: `${meta.accent}22`, border: `1px solid ${meta.accent}50`,
                      color: meta.accent, fontSize: 10, fontWeight: 700,
                      padding: "4px 12px", borderRadius: 100,
                    }}>
                      Current
                    </div>
                  )}

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: `${meta.accent}18`, border: `1px solid ${meta.accent}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, color: meta.accent
                    }}>
                      {meta.icon}
                    </div>
                    <div>
                      <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: meta.accent }}>{plan.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{plan.price}</div>
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, marginBottom: 24 }}>
                    {[
                      { k: "Bots", v: plan.maxBots === -1 ? "Unlimited" : plan.maxBots },
                      { k: "RAM", v: `${plan.ramMb}MB` },
                      { k: "CPU", v: `${plan.cpuLimit}%` },
                      { k: "Upload Limit", v: plan.maxUploadMb >= 1024 ? `${plan.maxUploadMb / 1024} GB` : `${plan.maxUploadMb} MB` },
                      { k: "Uptime SLA", v: plan.uptimePercent },
                      { k: "Regions", v: allowedCountries.length },
                    ].map(f => (
                      <div key={f.k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--text2)" }}>{f.k}</span>
                        <span style={{ fontWeight: 600, color: meta.accent }}>{f.v}</span>
                      </div>
                    ))}

                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Available Regions
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {allowedCountries.map(c => (
                          <span key={c.id} style={{
                            fontSize: 11, padding: "3px 8px", borderRadius: 8,
                            background: "var(--surface2)", border: "1px solid var(--border)"
                          }}>
                            {c.flag} {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    className={`btn ${isCurrent ? "btn-ghost" : "btn-primary"} w-full`}
                    style={{
                      justifyContent: "center",
                      background: isCurrent ? "var(--surface2)" : meta.highlight ? "#5865F2" : `${meta.accent}22`,
                      color: isCurrent ? "var(--text2)" : meta.highlight ? "#fff" : meta.accent,
                      border: `1px solid ${isCurrent ? "var(--border2)" : meta.highlight ? "transparent" : `${meta.accent}40`}`,
                      boxShadow: meta.highlight && !isCurrent ? "0 4px 20px rgba(88,101,242,0.3)" : "none"
                    }}
                    onClick={() => handleSelect(planId)}
                  >
                    {isCurrent ? "Current Plan ✓" : planId === "free" ? "Downgrade" : "Upgrade"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Comparison note */}
        <div style={{ marginTop: 48, textAlign: "center", padding: "24px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, maxWidth: 600, margin: "48px auto 0" }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>💬</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Need a custom plan?</div>
          <p style={{ fontSize: 13, color: "var(--text2)" }}>
            For enterprise use, special requirements, or bulk bot hosting — reach out on Discord for a custom quote.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
