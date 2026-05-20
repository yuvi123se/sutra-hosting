import React, { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ToastProvider } from "./Toast.jsx";
import { api, getToken, clearToken } from "./api.js";
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
  const location = useLocation();

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    api.me()
      .then(({ user, isOwner }) => { setUser(user); setIsOwner(!!isOwner); })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
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
    <AuthCtx.Provider value={{ user, setUser, isOwner, setIsOwner }}>
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
