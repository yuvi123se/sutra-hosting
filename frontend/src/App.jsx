import React, { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ToastProvider, useToast } from "./Toast.jsx";
import { api, getAvatarUrl, getToken, setToken, clearToken } from "./api.js";
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
    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get("token");
    const hasError = params.get("error");

    // Handle OAuth error
    if (hasError) {
      navigate("/", { replace: true });
      setLoading(false);
      return;
    }

    // Store token if it came back in the URL from Discord OAuth
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }

    const token = tokenFromUrl || getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    // Fetch the user FIRST, then clean the URL — this prevents the race
    // condition where navigate() triggers a re-render before user is set,
    // causing the protected route to redirect back to "/"
    api.me().then(({ user, isOwner }) => {
      setUser(user);
      setIsOwner(isOwner);
      setLoading(false);
      // Only clean URL after user is confirmed — safe to navigate now
      if (tokenFromUrl) {
        navigate(location.pathname, { replace: true });
      }
    }).catch(() => {
      clearToken();
      setLoading(false);
      navigate("/", { replace: true });
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

  const isAuthPage = location.pathname === "/";
  const isLoggedIn = !!user;

  return (
    <AuthCtx.Provider value={{ user, setUser, isOwner }}>
      <div className="mesh-bg" />
      {isLoggedIn && !isAuthPage && <Sidebar />}
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/dashboard" element={isLoggedIn ? <DashboardPage /> : <Navigate to="/" />} />
          <Route path="/bots" element={isLoggedIn ? <BotsPage /> : <Navigate to="/" />} />
          <Route path="/plans" element={isLoggedIn ? <PlansPage /> : <Navigate to="/" />} />
          <Route path="/admin" element={isLoggedIn && isOwner ? <AdminPage /> : <Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/"} />} />
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
