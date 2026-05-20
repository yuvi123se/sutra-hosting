import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setToken } from "../api.js";

const API_BASE = "https://sutra-api-ldhf.onrender.com";

// This page handles /auth/callback?code=...
// Discord redirects to backend /auth/discord/callback which bounces the
// code here. The browser then POSTs the code to /auth/discord/exchange-code
// using the USER'S IP — not Render's shared IP — so Discord never rate-limits.
export default function CallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("Completing login...");
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const err = params.get("error");

    if (err || !code) {
      setError("Discord login failed. Please try again.");
      setTimeout(() => navigate("/", { replace: true }), 2500);
      return;
    }

    // POST code to backend — this fetch comes from the user's browser IP,
    // not from Render's shared IP, so Discord won't 429 it.
    fetch(`${API_BASE}/auth/discord/exchange-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.token) throw new Error(data.error || "Auth failed");
        return data.token;
      })
      .then((token) => {
        setToken(token);
        navigate("/dashboard", { replace: true });
      })
      .catch((e) => {
        setError(e.message || "Login failed. Please try again.");
        setTimeout(() => navigate("/", { replace: true }), 2500);
      });
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", flexDirection: "column", gap: 16,
    }}>
      {error ? (
        <>
          <div style={{ fontSize: 36 }}>✕</div>
          <p style={{ color: "#ED4245", fontSize: 15 }}>{error}</p>
          <p style={{ color: "var(--text3)", fontSize: 13 }}>Redirecting to login...</p>
        </>
      ) : (
        <>
          <div style={{
            width: 48, height: 48,
            border: "3px solid rgba(88,101,242,0.2)",
            borderTop: "3px solid #5865F2",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "#8892b0", fontSize: 14 }}>{status}</p>
        </>
      )}
    </div>
  );
}
