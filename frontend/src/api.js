const BASE = "https://sutra-api-ldhf.onrender.com";

export function getToken() {
  return localStorage.getItem("sutra_token");
}

export function setToken(token) {
  localStorage.setItem("sutra_token", token);
}

export function clearToken() {
  localStorage.removeItem("sutra_token");
}

async function req(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: { "Content-Type": "application/json" }
  };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}/${path}`, opts);
  if (res.status === 204) return {};
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  me: () => req("GET", "auth/me"),
  logout: () => req("POST", "auth/logout"),
  plans: () => req("GET", "plans"),

  bots: () => req("GET", "bots"),
  createBot: (data) => req("POST", "bots", data),
  updateBot: (id, data) => req("PATCH", `bots/${id}`, data),
  deleteBot: (id) => req("DELETE", `bots/${id}`),

  adminStats: () => req("GET", "admin/stats"),
  adminUsers: () => req("GET", "admin/users"),
  adminBots: () => req("GET", "admin/bots"),
  adminSetPlan: (discordId, plan) => req("PATCH", `admin/users/${discordId}/plan`, { plan }),
  adminDeleteBot: (id) => req("DELETE", `admin/bots/${id}`),
  adminSetBotStatus: (id, status) => req("PATCH", `admin/bots/${id}/status`, { status }),
};

export const COUNTRIES = [
  { id: "india", label: "India", flag: "🇮🇳", region: "Asia" },
  { id: "singapore", label: "Singapore", flag: "🇸🇬", region: "Asia" },
  { id: "us-east", label: "US East", flag: "🇺🇸", region: "Americas" },
  { id: "us-west", label: "US West", flag: "🇺🇸", region: "Americas" },
  { id: "europe", label: "Europe", flag: "🇪🇺", region: "Europe" },
  { id: "japan", label: "Japan", flag: "🇯🇵", region: "Asia" },
  { id: "australia", label: "Australia", flag: "🇦🇺", region: "Pacific" },
  { id: "brazil", label: "Brazil", flag: "🇧🇷", region: "Americas" },
];

export const RUNTIMES = [
  { id: "nodejs", label: "Node.js", icon: "⬡" },
  { id: "python", label: "Python", icon: "🐍" },
  { id: "java", label: "Java", icon: "☕" },
  { id: "go", label: "Go", icon: "🐹" },
];

export function getCountry(id) {
  return COUNTRIES.find(c => c.id === id) || { id, label: id, flag: "🌍" };
}

export function getAvatarUrl(user) {
  if (!user) return null;
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=64`;
  }
  return null;
}

export function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
