import React, { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ToastProvider } from "./Toast.jsx";
import { api, getToken, setToken, clearToken } from "./api.js";
import LoginPage from "./pages/Login.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import BotsPage from "./pages/Bots.jsx";
import PlansPage from "./pages/Plans.jsx";
import AdminPage from "./pages/Admin.jsx";
import Sidebar from "./components/Sidebar.jsx";

export const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AppInner() {
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Read token synchronously from URL — do this before any async work
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    const hasError = params.get("error");

    if (hasError) {
      window.history.replaceState({}, "", "/");
      setLoading(false);
      return;
    }

    if (tokenFromUrl) {
      // Save and immediately strip from URL (no React re-render)
      setToken(tokenFromUrl);
      window.history.replaceState({}, "", "/dashboard");
    }

    const token = tokenFromUrl || getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    api.me()
      .then(({ user, isOwner }) => {
        setUser(user);
        setIsOwner(isOwner);
      })
      .catch(() => {
        // Only clear token and redirect if there was NO fresh token from URL.
        // A fresh URL token means Discord just authenticated us — the backend
        // is probably cold-starting on Render. Don't boot the user out.
        if (!tokenFromUrl) {
          clearToken();
          window.history.replaceState({}, "", "/");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, border: "3px solid rgba(88,101,242,0.2)", borderTop: "3px solid #5865F2", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#8892b0", fontSize: 14 }}>Loading Sutra Hosting...</p>
      </div>
    );
  }

  const isLoggedIn = !!user;

  return (
    <AuthCtx.Provider value={{ user, setUser, isOwner }}>
      <div className="mesh-bg" />
      {isLoggedIn && location.pathname !== "/" && <Sidebar />}
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="/dashboard" element={isLoggedIn ? <DashboardPage /> : <Navigate to="/" replace />} />
          <Route path="/bots" element={isLoggedIn ? <BotsPage /> : <Navigate to="/" replace />} />
          <Route path="/plans" element={isLoggedIn ? <PlansPage /> : <Navigate to="/" replace />} />
          <Route path="/admin" element={isLoggedIn && isOwner ? <AdminPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/"} replace />} />
        </Routes>
      </AnimatePresence>
    </AuthCtx.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
