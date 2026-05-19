export default function SutraHosting() {
  const plans = [
    {
      name: "Starter",
      ram: "512MB RAM",
      price: "0.03 LTC",
      features: ["1 Bot", "24/7 Uptime", "Basic Node"],
    },
    {
      name: "Creator",
      ram: "1GB RAM",
      price: "0.08 LTC",
      features: ["5 Bots", "Fast CPU", "Priority Support"],
    },
    {
      name: "Infinity",
      ram: "4GB RAM",
      price: "0.18 LTC",
      features: ["Unlimited Bots", "Dedicated Power", "Premium Nodes"],
    },
  ];

  const bots = [
    {
      name: "Bitsy",
      status: "Online",
      runtime: "Node.js",
    },
    {
      name: "Ocean AI",
      status: "Sleeping",
      runtime: "Python",
    },
  ];

  return (
    <div className="min-h-screen bg-[#060816] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,124,255,0.18),transparent_30%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(120,80,255,0.12),transparent_25%)]" />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-72 border-r border-white/5 bg-white/[0.03] backdrop-blur-xl flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold shadow-2xl shadow-blue-500/30">
                S
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Sutra Hosting
                </h1>
                <p className="text-sm text-white/40">
                  by Sutra Development
                </p>
              </div>
            </div>

            <nav className="space-y-3">
              {[
                "Dashboard",
                "Deployments",
                "Billing",
                "Nodes",
                "Analytics",
              ].map((item) => (
                <button
                  key={item}
                  className="w-full text-left px-5 py-4 rounded-2xl bg-white/[0.03] hover:bg-blue-500 transition-all duration-300 border border-white/5 hover:border-blue-400/30"
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-5 backdrop-blur-xl">
            <p className="text-sm text-white/50 mb-1">Cluster Status</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold">All systems online</span>
            </div>

            <button className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 transition-all font-semibold shadow-lg shadow-blue-500/30">
              Open Console
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-5 py-5 lg:p-8">
          {/* Mobile Topbar */}
          <div className="lg:hidden flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Sutra Hosting</h1>
              <p className="text-white/40 text-sm">Cloud Dashboard</p>
            </div>

            <button className="px-4 py-3 rounded-2xl bg-blue-500 font-semibold">
              Menu
            </button>
          </div>

          {/* Hero */}
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#121a38] via-[#182347] to-[#10162f] p-8 lg:p-12 shadow-2xl shadow-black/40">
            <div className="absolute right-[-120px] top-[-120px] w-[300px] h-[300px] rounded-full bg-blue-500/20 blur-3xl" />

            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-sm mb-6">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  PREMIUM CLOUD HOSTING
                </div>

                <h2 className="text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-6">
                  Deploy Discord bots instantly.
                </h2>

                <p className="text-lg text-white/60 leading-relaxed max-w-xl mb-8">
                  Modern immersive hosting for Discord bots, APIs and AI apps.
                  Built for speed, stability and clean deployment management.
                </p>

                <div className="flex flex-wrap gap-4">
                  <button className="px-7 py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 transition-all duration-300 font-semibold shadow-2xl shadow-blue-500/30 hover:scale-105">
                    Deploy Bot
                  </button>

                  <button className="px-7 py-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all duration-300 font-semibold">
                    Login with Discord
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[2rem] border border-white/10 bg-[#0c1124]/80 backdrop-blur-xl p-6 shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-white/40 text-sm">Cluster Usage</p>
                      <h3 className="text-3xl font-bold">87%</h3>
                    </div>

                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/40 flex items-center justify-center text-2xl font-black">
                      12
                    </div>
                  </div>

                  <div className="space-y-5">
                    {["CPU", "RAM", "Network"].map((metric, i) => (
                      <div key={metric}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-white/60">{metric}</span>
                          <span>{[72, 81, 64][i]}%</span>
                        </div>

                        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${[72, 81, 64][i]}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Plans */}
          <section className="mt-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-3xl font-bold mb-1">Hosting Plans</h3>
                <p className="text-white/40">
                  Litecoin powered premium hosting.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="group rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7 hover:border-blue-400/30 hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h4 className="text-2xl font-bold mb-1">
                        {plan.name}
                      </h4>
                      <p className="text-white/40">{plan.ram}</p>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-xl">
                      ⚡
                    </div>
                  </div>

                  <div className="text-5xl font-black mb-6 tracking-tight">
                    {plan.price}
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-3 text-white/70"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 transition-all duration-300 font-semibold shadow-xl shadow-blue-500/20 group-hover:shadow-blue-500/40">
                    Buy with LTC
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Bots */}
          <section className="mt-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-3xl font-bold mb-1">Deployments</h3>
                <p className="text-white/40">
                  Manage active Discord bots.
                </p>
              </div>

              <button className="px-6 py-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-blue-500 transition-all duration-300 font-semibold">
                + New Deployment
              </button>
            </div>

            <div className="space-y-5">
              {bots.map((bot) => (
                <div
                  key={bot.name}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-xl shadow-blue-500/30">
                      🤖
                    </div>

                    <div>
                      <h4 className="text-2xl font-bold mb-1">
                        {bot.name}
                      </h4>

                      <p className="text-white/40">{bot.runtime}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className={`px-5 py-3 rounded-2xl font-semibold border ${
                        bot.status === "Online"
                          ? "bg-green-500/10 border-green-400/20 text-green-300"
                          : "bg-orange-500/10 border-orange-400/20 text-orange-300"
                      }`}
                    >
                      {bot.status}
                    </div>

                    <button className="px-5 py-3 rounded-2xl bg-white/[0.05] hover:bg-blue-500 transition-all duration-300 border border-white/10">
                      Restart
                    </button>

                    <button className="px-5 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500 transition-all duration-300 border border-red-400/20 text-red-300 hover:text-white">
                      Stop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
