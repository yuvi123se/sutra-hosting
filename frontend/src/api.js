const BASE = "https://sutra-hosting.onrender.com";

export function getToken() { return localStorage.getItem("sutra_token"); }
export function setToken(token) { localStorage.setItem("sutra_token", token); }
export function clearToken() { localStorage.removeItem("sutra_token"); }

async function req(method, path, body) {
  const token = getToken();
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}/${path}`, opts);
  if (res.status === 204) return {};
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  // Auth
  login: (username, password) => req("POST", "auth/login", { username, password }),
  register: (username, password, email) => req("POST", "auth/register", { username, password, email }),
  me: () => req("GET", "auth/me"),
  logout: () => req("POST", "auth/logout"),

  // Plans
  plans: () => req("GET", "plans"),

  // Bots
  bots: () => req("GET", "bots"),
  createBot: (data) => req("POST", "bots", data),
  updateBot: (id, data) => req("PATCH", `bots/${id}`, data),
  deleteBot: (id) => req("DELETE", `bots/${id}`),
  uploadCode: (id, code) => req("PATCH", `bots/${id}`, { code }),
  startBot: (id) => req("POST", `bots/${id}/start`),
  stopBot: (id) => req("POST", `bots/${id}/stop`),
  restartBot: (id) => req("POST", `bots/${id}/restart`),
  botLogs: (id) => req("GET", `bots/${id}/logs`),
  botStatus: (id) => req("GET", `bots/${id}/status`),

  // Admin
  adminStats: () => req("GET", "admin/stats"),
  adminUsers: () => req("GET", "admin/users"),
  adminBots: () => req("GET", "admin/bots"),
  adminSetPlan: (userId, plan) => req("PATCH", `admin/users/${userId}/plan`, { plan }),
  adminDeleteBot: (id) => req("DELETE", `admin/bots/${id}`),
  adminStartBot: (id) => req("POST", `admin/bots/${id}/start`),
  adminStopBot: (id) => req("POST", `admin/bots/${id}/stop`),
};

export const COUNTRIES = [
  { id: "india",     label: "India",     flag: "🇮🇳", region: "Asia" },
  { id: "singapore", label: "Singapore", flag: "🇸🇬", region: "Asia" },
  { id: "us-east",   label: "US East",   flag: "🇺🇸", region: "Americas" },
  { id: "us-west",   label: "US West",   flag: "🇺🇸", region: "Americas" },
  { id: "europe",    label: "Europe",    flag: "🇪🇺", region: "Europe" },
  { id: "japan",     label: "Japan",     flag: "🇯🇵", region: "Asia" },
  { id: "australia", label: "Australia", flag: "🇦🇺", region: "Pacific" },
  { id: "brazil",    label: "Brazil",    flag: "🇧🇷", region: "Americas" },
];

export const RUNTIMES = [
  { id: "nodejs", label: "Node.js", icon: "⬡" },
  { id: "python", label: "Python",  icon: "🐍" },
  { id: "java",   label: "Java",    icon: "☕" },
  { id: "go",     label: "Go",      icon: "🐹" },
];

export function getCountry(id) {
  return COUNTRIES.find(c => c.id === id) || { id, label: id, flag: "🌍" };
}

// Returns initials avatar since we no longer use Discord CDN
export function getAvatarUrl(user) {
  return null; // UI should fall back to initials
}

export function getUserInitials(user) {
  if (!user?.username) return "?";
  return user.username.slice(0, 2).toUpperCase();
}

export function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatUptime(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
