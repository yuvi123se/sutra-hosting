import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useToast } from "../Toast.jsx";

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
  const location = useLocation();
  const toast = useToast();
  const canvasRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("error") === "auth_failed") {
      toast("Discord login failed. Please try again.", "error");
    }
  }, []);

  // Particle canvas effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const particles = [];
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(88,101,242,${p.alpha})`;
        ctx.fill();
      });

      // Connect nearby
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
        <a
          href="/auth/discord"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 12,
            background: "#5865F2", color: "#fff",
            fontWeight: 600, fontSize: 14, textDecoration: "none",
            boxShadow: "0 4px 16px rgba(88,101,242,0.4)",
            transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.target.style.background = "#6872f5"; e.target.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.target.style.background = "#5865F2"; e.target.style.transform = ""; }}
        >
          <DiscordIcon /> Login
        </a>
      </header>

      {/* Hero */}
      <main style={{ position: "relative", zIndex: 2, maxWidth: 1100, margin: "0 auto", padding: "60px 40px" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 80 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 100,
            background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.25)",
            color: "#a5b4fc", fontSize: 12, fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
            marginBottom: 24
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5865F2", display: "inline-block", animation: "pulse-glow 2s infinite" }} />
            Discord Bot Hosting Platform
          </div>

          <h1 style={{
            fontFamily: "Syne", fontSize: "clamp(40px, 7vw, 80px)",
            fontWeight: 800, lineHeight: 1, marginBottom: 24,
            background: "linear-gradient(135deg, #fff 40%, #a5b4fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Host your bots.<br />Own your uptime.
          </h1>

          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text2)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Sutra Hosting gives you a reliable, fast home for your Discord bots — 
            free tier included, no credit card required.
          </p>

          <a
            href="/auth/discord"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "16px 36px", borderRadius: 16,
              background: "#5865F2", color: "#fff",
              fontWeight: 700, fontSize: 16, textDecoration: "none",
              boxShadow: "0 8px 32px rgba(88,101,242,0.45)",
              transition: "all 0.25s"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(88,101,242,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(88,101,242,0.45)"; }}
          >
            <DiscordIcon size={22} />
            Continue with Discord
          </a>

          <p style={{ marginTop: 14, fontSize: 12, color: "var(--text3)" }}>
            Free forever · No credit card needed · Up in 30 seconds
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 80 }}
        >
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20, padding: "20px 22px",
              transition: "all 0.25s"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(88,101,242,0.3)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>{f.desc}</div>
            </div>
          ))}
        </motion.div>

        {/* Plans preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <h2 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>Simple pricing</h2>
          <p style={{ textAlign: "center", color: "var(--text2)", fontSize: 14, marginBottom: 32 }}>Start free. Upgrade when you need more.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {PLANS_PREVIEW.map((p, i) => (
              <div key={i} style={{
                background: p.popular ? "rgba(88,101,242,0.08)" : "var(--surface)",
                border: `1px solid ${p.popular ? "rgba(88,101,242,0.35)" : "var(--border)"}`,
                borderRadius: 20, padding: "22px",
                position: "relative",
                transition: "all 0.25s"
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
              >
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
    </div>
  );
}

function DiscordIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 71 55" fill="currentColor">
      <path d="M60.1 4.9A58.6 58.6 0 0 0 45.6.9a.2.2 0 0 0-.2.1c-.6 1.1-1.3 2.6-1.8 3.7a54.1 54.1 0 0 0-16.2 0c-.5-1.2-1.2-2.6-1.8-3.7a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 11 4.9a.2.2 0 0 0-.1.1C1.6 19.1-.9 32.8.3 46.4c0 .1.1.2.2.2a59 59 0 0 0 17.7 9 .2.2 0 0 0 .2-.1c1.4-1.9 2.6-3.9 3.7-5.9.1-.1 0-.3-.2-.3a38.8 38.8 0 0 1-5.5-2.6c-.2-.1-.2-.3 0-.4l1.1-.9c.1-.1.2-.1.3 0 11.6 5.3 24.1 5.3 35.5 0 .1 0 .2 0 .3.1l1.1.9c.2.1.2.3 0 .4a36.2 36.2 0 0 1-5.5 2.6c-.2.1-.2.2-.1.3 1.1 2 2.3 4 3.7 5.9.1.1.2.1.3.1a58.8 58.8 0 0 0 17.7-9c.1-.1.2-.1.2-.2 1.4-15.6-2.4-29.2-10.1-41.3a.2.2 0 0 0-.1-.1zM23.7 38.2c-3.5 0-6.4-3.2-6.4-7.1s2.9-7.1 6.4-7.1 6.5 3.2 6.4 7.1c0 3.9-2.9 7.1-6.4 7.1zm23.7 0c-3.5 0-6.4-3.2-6.4-7.1s2.9-7.1 6.4-7.1 6.4 3.2 6.4 7.1c0 3.9-2.8 7.1-6.4 7.1z"/>
    </svg>
  );
}
