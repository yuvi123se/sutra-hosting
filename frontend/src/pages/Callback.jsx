import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setToken } from "../api.js";

const API_BASE = "https://sutra-hosting.onrender.com";
const DISCORD_CLIENT_ID = "1406977976066900099";
const DISCORD_REDIRECT_URI = "https://sutra-hosting.onrender.com/auth/discord/callback";

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
      // Step 1: Exchange code → Discord access_token from the BROWSER
      // Discord allows this from the browser for public OAuth apps (no secret needed).
      // This uses the user's own IP so Render's shared IP rate limit is bypassed.
      setStatus("Exchanging token with Discord…");

      let access_token = null;

      try {
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

        const contentType = tokenRes.headers.get("content-type") || "";

        if (tokenRes.status === 429) {
          // Discord app-level rate limit — wait and retry once
          const retryAfter = tokenRes.headers.get("retry-after");
          const wait = retryAfter ? Math.ceil(parseFloat(retryAfter) * 1000) : 3000;
          setStatus(`Rate limited — retrying in ${Math.ceil(wait / 1000)}s…`);
          await new Promise(r => setTimeout(r, wait));

          const retryRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: DISCORD_CLIENT_ID,
              grant_type: "authorization_code",
              code,
              redirect_uri: DISCORD_REDIRECT_URI,
            }),
          });

          if (!retryRes.ok) {
            const body = await retryRes.text();
            throw new Error(`Discord rate limited (${retryRes.status}). Try again in a minute.`);
          }

          const retryData = await retryRes.json();
          access_token = retryData.access_token;

        } else if (!contentType.includes("application/json")) {
          // Got HTML back — probably a rate limit or Discord error page
          const body = await tokenRes.text();
          throw new Error(`Discord returned unexpected response (${tokenRes.status}). Try again shortly.`);

        } else {
          const tokenData = await tokenRes.json();
          if (!tokenRes.ok || !tokenData.access_token) {
            throw new Error(tokenData.error_description || tokenData.error || "Token exchange failed");
          }
          access_token = tokenData.access_token;
        }

      } catch (fetchErr) {
        // CORS or network error — browser can't reach Discord directly
        // Fall back to backend exchange (may still work if not rate-limited there)
        if (fetchErr.message.includes("rate limited") || fetchErr.message.includes("unexpected response")) {
          throw fetchErr; // Don't bother with backend if Discord itself is rate-limiting
        }
        console.warn("Browser token exchange failed (likely CORS), trying backend:", fetchErr.message);
        access_token = await exchangeViaBackend(code);
      }

      // Step 2: Send Discord access_token to our backend → get a JWT
      setStatus("Verifying with server…");
      const verifyRes = await fetch(`${API_BASE}/auth/discord/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token }),
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
      setTimeout(() => navigate("/", { replace: true }), 3000);
    }
  }

  // Backend fallback: send raw code, backend exchanges with Discord
  async function exchangeViaBackend(code) {
    const res = await fetch(`${API_BASE}/auth/discord/exchange-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Backend auth failed");
    // exchange-code now returns a jwt directly
    if (data.token) {
      setToken(data.token);
      navigate("/dashboard", { replace: true });
      throw new Error("__DONE__"); // Abort the rest of doLogin
    }
    throw new Error("No token from backend");
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", flexDirection: "column", gap: 16,
    }}>
      {error ? (
        <>
          <div style={{ fontSize: 36 }}>✕</div>
          <p style={{ color: "#ED4245", fontSize: 15, textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
            {error}
          </p>
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
