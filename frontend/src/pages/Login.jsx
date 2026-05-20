import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useToast } from "../Toast.jsx";
import { api, setToken } from "../api.js";
import { useAuth } from "../App.jsx";

const FEATURES = [
  { icon: "⚡", title: "Instant Deploy", desc: "Your bot live in under 30 seconds" },
  { icon: "🌍", title: "Global Nodes", desc: "8 regions, low latency worldwide" },
  { icon: "🔒", title: "DDoS Protected", desc: "Enterprise-grade security built-in" },
  { icon: "📊", title: "Live Metrics", desc: "CPU, RAM, uptime — all in one place" },
];

const PLANS_PREVIEW = [
  { name: "Free", price: "₹0/mo", bots: "1 Bot", ram: "256MB RAM", accent: "#8892b0", freeOnly: true },
  { name: "Starter", price: "₹149/mo", bots: "3 Bots", ram: "512MB RAM", accent: "#a5b4fc" },
  { name: "Pro", price: "₹399/mo", bots: "10 Bots", ram: "1GB RAM", accent: "#5865F2", popular: true },
  { name: "Ultra", price: "₹999/mo", bots: "Unlimited", ram: "4GB RAM", accent: "#fbbf24" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { setUser, setIsOwner } = useAuth();
  const canvasRef = useRef(null);

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const particles = [];

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.4 + 0.1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(88,101,242,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(88,101,242,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await api.login(username, password);
      } else {
        data = await api.register(username, password, email);
      }
      setToken(data.token);
      setUser(data.user);
      setIsOwner(data.isOwner ?? false);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast(err.message || "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "11px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border)",
    borderRadius: 10, color: "var(--text1)",
    fontSize: 14, outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <header style={{ position: "relative", zIndex: 2, padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #5865F2, #7289da)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: "0 4px 20px rgba(88,101,242,0.5)"
          }}>⟁</div>
          <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>Sutra Hosting</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "10px 20px", borderRadius: 12,
            background: "#5865F2", color: "#fff", border: "none",
            fontWeight: 600, fontSize: 14, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(88,101,242,0.4)", transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.target.style.background = "#6872f5"; e.target.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.target.style.background = "#5865F2"; e.target.style.transform = ""; }}
        >
          Sign In
        </button>
      </header>

      {/* Hero */}
      <main style={{ position: "relative", zIndex: 2, maxWidth: 1100, margin: "0 auto", padding: "60px 40px" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 80 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 100,
            background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.25)",
            color: "#a5b4fc", fontSize: 12, fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 24
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5865F2", display: "inline-block", animation: "pulse-glow 2s infinite" }} />
            Discord Bot Hosting Platform
          </div>

          <h1 style={{
            fontFamily: "Syne", fontSize: "clamp(40px, 7vw, 80px)",
            fontWeight: 800, lineHeight: 1, marginBottom: 24,
            background: "linear-gradient(135deg, #fff 40%, #a5b4fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>
            Host your bots.<br />Own your uptime.
          </h1>

          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text2)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Sutra Hosting gives you a reliable, fast home for your Discord bots —
            free tier included, no credit card required.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setMode("register"); setShowForm(true); }}
              style={{
                padding: "16px 36px", borderRadius: 16, border: "none",
                background: "#5865F2", color: "#fff", fontWeight: 700, fontSize: 16,
                cursor: "pointer", boxShadow: "0 8px 32px rgba(88,101,242,0.45)", transition: "all 0.25s"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(88,101,242,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(88,101,242,0.45)"; }}
            >
              Get Started Free
            </button>
            <button
              onClick={() => { setMode("login"); setShowForm(true); }}
              style={{
                padding: "16px 36px", borderRadius: 16,
                background: "rgba(255,255,255,0.06)", color: "#fff",
                border: "1px solid var(--border)", fontWeight: 600, fontSize: 16,
                cursor: "pointer", transition: "all 0.25s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = ""; }}
            >
              Sign In
            </button>
          </div>

          <p style={{ marginTop: 14, fontSize: 12, color: "var(--text3)" }}>
            Free forever · No credit card needed · Up in 30 seconds
          </p>
        </motion.div>

        {/* Features */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 80 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 22px", transition: "all 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(88,101,242,0.3)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>{f.desc}</div>
            </div>
          ))}
        </motion.div>

        {/* Plans */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
          <h2 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Simple pricing</h2>
          <p style={{ textAlign: "center", color: "var(--text2)", fontSize: 14, marginBottom: 32 }}>Start free. Upgrade when you need more.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {PLANS_PREVIEW.map((p, i) => (
              <div key={i} style={{
                background: p.popular ? "rgba(88,101,242,0.08)" : "var(--surface)",
                border: `1px solid ${p.popular ? "rgba(88,101,242,0.35)" : "var(--border)"}`,
                borderRadius: 20, padding: "22px", position: "relative", transition: "all 0.25s"
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}>
                {p.popular && (
                  <div style={{
                    position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                    background: "#5865F2", color: "#fff", fontSize: 10, fontWeight: 700,
                    padding: "3px 12px", borderRadius: 100, whiteSpace: "nowrap",
                    letterSpacing: "0.06em", textTransform: "uppercase"
                  }}>Most Popular</div>
                )}
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: p.accent, marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{p.price}</div>
                <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>✓ {p.bots}</div>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>✓ {p.ram}</div>
                {p.freeOnly && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>India region only</div>}
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      <footer style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "40px", color: "var(--text3)", fontSize: 12 }}>
        © 2025 Sutra Hosting · Made with ⟁
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 24, padding: "36px 32px", width: "100%", maxWidth: 400,
                boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              }}
            >
              {/* Logo */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "linear-gradient(135deg, #5865F2, #7289da)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, margin: "0 auto 12px",
                  boxShadow: "0 4px 20px rgba(88,101,242,0.4)"
                }}>⟁</div>
                <h2 style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 22, margin: 0 }}>
                  {mode === "login" ? "Welcome back" : "Create account"}
                </h2>
                <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>
                  {mode === "login" ? "Sign in to Sutra Hosting" : "Start hosting for free"}
                </p>
              </div>

              {/* Tab toggle */}
              <div style={{
                display: "flex", background: "rgba(255,255,255,0.04)",
                borderRadius: 10, padding: 3, marginBottom: 24,
              }}>
                {["login", "register"].map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: "8px", borderRadius: 8, border: "none",
                    background: mode === m ? "rgba(88,101,242,0.3)" : "transparent",
                    color: mode === m ? "#fff" : "var(--text3)",
                    fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
                  }}>
                    {m === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: 6 }}>USERNAME</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="your_username"
                    required
                    autoFocus
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#5865F2"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                  />
                </div>

                {mode === "register" && (
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: 6 }}>EMAIL <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optional)</span></label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = "#5865F2"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: 6 }}>PASSWORD</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                    required
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "#5865F2"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: 4, padding: "13px", borderRadius: 12, border: "none",
                    background: loading ? "rgba(88,101,242,0.5)" : "#5865F2",
                    color: "#fff", fontWeight: 700, fontSize: 15,
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    boxShadow: loading ? "none" : "0 4px 20px rgba(88,101,242,0.4)",
                  }}
                >
                  {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text3)" }}>
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setMode(mode === "login" ? "register" : "login")}
                  style={{ background: "none", border: "none", color: "#a5b4fc", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>
                  {mode === "login" ? "Register" : "Sign In"}
                </button>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
