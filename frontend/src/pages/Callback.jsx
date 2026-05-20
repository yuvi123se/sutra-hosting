import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setToken } from "../api.js";

const API_BASE = "https://sutra-hosting.onrender.com";

// Discord OAuth2 app credentials (public-safe: client secret NOT needed here)
const DISCORD_CLIENT_ID = "1406977976066900099";
// The redirect URI must exactly match what's registered in the Discord Developer Portal
const DISCORD_REDIRECT_URI = "https://sutra-hosting.onrender.com/auth/discord/callback";

/**
 * How this works (avoids Render's shared-IP 429 problem):
 *
 *  1. Discord redirects → backend /auth/discord/callback
 *  2. Backend immediately redirects → frontend /auth/callback?code=...
 *  3. THIS component runs in the USER'S browser:
 *       a. Calls Discord /oauth2/token directly  ← user's IP, never rate-limited
 *       b. Gets back a Discord access_token
 *       c. POSTs that token to backend /auth/discord/verify
 *       d. Backend fetches /users/@me, upserts user, returns JWT
 *
 * The client_secret is NOT required for the browser-side token exchange
 * when using PKCE — but Discord's standard code grant also works without it
 * if the application is set to "Public" (no secret required). If your app
 * requires the secret, keep it only on the backend and use the /verify route.
 *
 * If Discord rejects the browser exchange (confidential app), we fall back
 * to posting the raw code to /auth/discord/exchange-code on the backend.
 */
export default function CallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("Completing login…");
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

    doLogin(code);
  }, []);

  async function doLogin(code) {
    try {
      // ── Step 1: Exchange code → Discord access_token from the BROWSER ──────
      setStatus("Exchanging token with Discord…");
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          grant_type: "authorization_code",
          code,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
      });

      if (!tokenRes.ok) {
        // Discord confidential app requires client_secret — fall back to backend
        const text = await tokenRes.text();
        console.warn("Browser token exchange failed, falling back to backend:", text);
        await fallbackToBackend(code);
        return;
      }

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error("No access_token in Discord response");
      }

      // ── Step 2: Send Discord access_token to backend → get our JWT ─────────
      setStatus("Verifying with server…");
      const verifyRes = await fetch(`${API_BASE}/auth/discord/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: tokenData.access_token }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.token) {
        throw new Error(verifyData.error || "Server verification failed");
      }

      setToken(verifyData.token);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      console.error("Login error:", e);
      setError(e.message || "Login failed. Please try again.");
      setTimeout(() => navigate("/", { replace: true }), 2500);
    }
  }

  // Fallback: backend does the exchange (may 429 on shared IPs, but worth trying)
  async function fallbackToBackend(code) {
    const res = await fetch(`${API_BASE}/auth/discord/exchange-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) throw new Error(data.error || "Auth failed");
    setToken(data.token);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", flexDirection: "column", gap: 16,
    }}>
      {error ? (
        <>
          <div style={{ fontSize: 36 }}>✕</div>
          <p style={{ color: "#ED4245", fontSize: 15 }}>{error}</p>
          <p style={{ color: "var(--text3)", fontSize: 13 }}>Redirecting to login…</p>
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
