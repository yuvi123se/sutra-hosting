import React from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Bot,
  CreditCard,
  Server,
  Activity,
  Terminal,
  Shield,
  ChevronRight,
} from "lucide-react";

export default function SutraHosting() {
  const [page, setPage] = React.useState("dashboard");
  const [message, setMessage] = React.useState("Welcome back to Sutra Hosting.");
  const plans = [
    {
      name: "Starter",
      ram: "512MB RAM",
      price: "0.03 LTC",
      accent: "from-blue-500 to-cyan-400",
    },
    {
      name: "Creator",
      ram: "1GB RAM",
      price: "0.08 LTC",
      accent: "from-indigo-500 to-blue-500",
    },
    {
      name: "Infinity",
      ram: "4GB RAM",
      price: "0.18 LTC",
      accent: "from-violet-500 to-indigo-500",
    },
  ];

  const deployments = [
    {
      name: "Bitsy",
      runtime: "Node.js",
      status: "Online",
      cpu: "21%",
      ram: "412MB",
    },
    {
      name: "Ocean AI",
      runtime: "Python",
      status: "Sleeping",
      cpu: "0%",
      ram: "0MB",
    },
  ];

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,124,255,0.18),transparent_30%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(120,80,255,0.14),transparent_25%)]" />
      <div className="absolute top-[-120px] right-[-80px] w-[380px] h-[380px] rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-[290px] border-r border-white/5 bg-white/[0.03] backdrop-blur-2xl flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-4 mb-14">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 text-xl font-black">
                S
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  Sutra Hosting
                </h1>
                <p className="text-sm text-white/40">
                  Premium Cloud Platform
                </p>
              </div>
            </div>

            <nav className="space-y-3">
              {[
                {
                  icon: LayoutDashboard,
                  name: "dashboard",
                  label: "Dashboard",
                },
                {
                  icon: Bot,
                  name: "deployments",
                  label: "Deployments",
                },
                {
                  icon: Server,
                  name: "nodes",
                  label: "Nodes",
                },
                {
                  icon: Activity,
                  name: "analytics",
                  label: "Analytics",
                },
                {
                  icon: CreditCard,
                  name: "billing",
                  label: "Billing",
                },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setPage(item.name);
                    setMessage(`Opened ${item.label}`);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-300 group ${
                    page === item.name
                      ? "bg-blue-500 border-blue-400/30"
                      : "border-white/5 bg-white/[0.03] hover:bg-blue-500 hover:border-blue-400/20"
                  }`}
                >
                  <item.icon className="w-5 h-5 text-white/80" />

                  <span className="font-medium text-white/90">
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-white/40 text-sm mb-1">
                  Node Cluster
                </p>

                <h3 className="text-2xl font-bold">
                  12 Active
                </h3>
              </div>

              <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse" />
            </div>

            <button
              onClick={() => setMessage("Console opened successfully.")}
              className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 transition-all duration-300 font-semibold shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              Open Console
              <Terminal className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-5 py-5 lg:p-8">
          <div className="mb-6 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 text-blue-200 backdrop-blur-xl">
            {message}
          </div>
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black">
                Sutra Hosting
              </h1>
              <p className="text-white/40 text-sm">
                Cloud Dashboard
              </p>
            </div>

            <button className="px-5 py-3 rounded-2xl bg-blue-500 font-semibold shadow-lg shadow-blue-500/30">
              Menu
            </button>
          </div>

          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#121a38] via-[#182347] to-[#0f1429] p-8 lg:p-14 shadow-2xl shadow-black/40"
          >
            <div className="absolute right-[-120px] top-[-120px] w-[340px] h-[340px] rounded-full bg-blue-500/20 blur-3xl" />

            <div className="grid lg:grid-cols-2 gap-14 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-300 text-sm mb-7">
                  <Shield className="w-4 h-4" />
                  PREMIUM DISCORD HOSTING
                </div>

                <h2 className="text-5xl lg:text-7xl font-black leading-[0.95] tracking-tight mb-7">
                  Deploy bots.
                  <br />
                  Scale instantly.
                </h2>

                <p className="text-lg text-white/60 leading-relaxed max-w-xl mb-9">
                  High performance cloud hosting for Discord bots,
                  APIs and AI services with immersive deployment
                  management and Litecoin billing.
                </p>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setMessage("Deployment wizard launched.")}
                    className="px-7 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 transition-all duration-300 font-semibold shadow-2xl shadow-blue-500/30 hover:scale-105 flex items-center gap-2"
                  >
                    Deploy Bot
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => window.open("https://discord.com/login", "_blank")}
                    className="px-7 py-4 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-300 font-semibold"
                  >
                    Login with Discord
                  </button>
                </div>
              </div>

              {/* Hero Card */}
              <div className="rounded-[2rem] border border-white/10 bg-[#0c1124]/80 backdrop-blur-2xl p-7 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-white/40 text-sm mb-1">
                      Live Usage
                    </p>
                    <h3 className="text-4xl font-black">
                      87%
                    </h3>
                  </div>

                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-black shadow-2xl shadow-blue-500/30">
                    12
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      label: "CPU",
                      value: 72,
                    },
                    {
                      label: "RAM",
                      value: 84,
                    },
                    {
                      label: "Network",
                      value: 61,
                    },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/50">
                          {metric.label}
                        </span>
                        <span>{metric.value}%</span>
                      </div>

                      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Stats */}
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-10">
            {[
              ["Active Deployments", "42"],
              ["Online Nodes", "12"],
              ["API Latency", "19ms"],
              ["Servers Protected", "100%"],
            ].map((item) => (
              <div
                key={item[0]}
                className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
              >
                <p className="text-white/40 mb-3">
                  {item[0]}
                </p>
                <h3 className="text-4xl font-black tracking-tight">
                  {item[1]}
                </h3>
              </div>
            ))}
          </section>

          {/* Plans */}
          <section className="mt-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">
              <div>
                <h3 className="text-4xl font-black mb-2">
                  Hosting Plans
                </h3>
                <p className="text-white/40">
                  Premium Discord hosting powered by LTC.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <motion.div
                  whileHover={{ y: -8 }}
                  key={plan.name}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7 overflow-hidden relative"
                >
                  <div
                    className={`absolute inset-0 opacity-10 bg-gradient-to-br ${plan.accent}`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-3xl font-black mb-1">
                          {plan.name}
                        </h4>
                        <p className="text-white/40">
                          {plan.ram}
                        </p>
                      </div>

                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                        ⚡
                      </div>
                    </div>

                    <div className="text-5xl font-black tracking-tight mb-8">
                      {plan.price}
                    </div>

                    <div className="space-y-4 mb-8 text-white/70">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        24/7 Uptime
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        DDoS Protection
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        Global Nodes
                      </div>
                    </div>

                    <button
                      onClick={() => setMessage(`Selected ${plan.name} plan checkout.`)}
                      className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 transition-all duration-300 font-semibold shadow-xl shadow-blue-500/30"
                    >
                      Buy with LTC
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Deployments */}
          <section className="mt-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">
              <div>
                <h3 className="text-4xl font-black mb-2">
                  Deployments
                </h3>
                <p className="text-white/40">
                  Manage running Discord applications.
                </p>
              </div>

              <button
                onClick={() => setMessage("New deployment modal opened.")}
                className="px-6 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 transition-all duration-300 font-semibold shadow-xl shadow-blue-500/30"
              >
                + New Deployment
              </button>
            </div>

            <div className="space-y-5">
              {deployments.map((bot) => (
                <motion.div
                  whileHover={{ y: -4 }}
                  key={bot.name}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 text-2xl">
                      🤖
                    </div>

                    <div>
                      <h4 className="text-2xl font-bold mb-1">
                        {bot.name}
                      </h4>

                      <p className="text-white/40">
                        {bot.runtime}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-5">
                    <div>
                      <p className="text-xs text-white/40 mb-1">
                        CPU
                      </p>
                      <h5 className="font-bold">
                        {bot.cpu}
                      </h5>
                    </div>

                    <div>
                      <p className="text-xs text-white/40 mb-1">
                        RAM
                      </p>
                      <h5 className="font-bold">
                        {bot.ram}
                      </h5>
                    </div>

                    <div
                      className={`px-5 py-3 rounded-2xl font-semibold border ${
                        bot.status === "Online"
                          ? "bg-green-500/10 border-green-400/20 text-green-300"
                          : "bg-orange-500/10 border-orange-400/20 text-orange-300"
                      }`}
                    >
                      {bot.status}
                    </div>

                    <button
                      onClick={() => setMessage(`${bot.name} restarted successfully.`)}
                      className="px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-blue-500 transition-all duration-300"
                    >
                      Restart
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
