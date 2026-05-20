import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../App.jsx";
import { api, getAvatarUrl, clearToken } from "../api.js";
import { useToast } from "../Toast.jsx";

const NAV = [
  { path: "/dashboard", label: "Dashboard", icon: "⬡" },
  { path: "/bots", label: "My Bots", icon: "🤖" },
  { path: "/plans", label: "Plans", icon: "✦" },
];

export default function Sidebar() {
  const { user, setUser, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  async function handleLogout() {
    try {
      await api.logout();
    } catch {}
    clearToken();
    setUser(null);
    navigate("/");
  }

  const avatarUrl = getAvatarUrl(user);
  const planColor = {
    free: "#8892b0",
    starter: "#a5b4fc",
    pro: "#5865F2",
    ultra: "#fbbf24"
  }[user?.plan || "free"];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #5865F2, #7289da)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, boxShadow: "0 4px 16px rgba(88,101,242,0.4)"
          }}>
            ⟁
          </div>
          <div>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Sutra Hosting</div>
            <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Bot Hosting</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 14px", marginBottom: 6 }}>
          Menu
        </div>
        {NAV.map(item => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}


      </nav>

      {/* User info */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "14px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${planColor}` }} />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #5865F2, #7289da)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, border: `2px solid ${planColor}`
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.username}
            </div>
            <div style={{ fontSize: 11, color: planColor, fontWeight: 600, textTransform: "capitalize" }}>
              {user?.plan || "free"} plan
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 4, borderRadius: 6, fontSize: 14, transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "var(--red)"}
            onMouseLeave={e => e.target.style.color = "var(--text3)"}
          >
            ⏏
          </button>
        </div>
      </div>
    </aside>
  );
}
