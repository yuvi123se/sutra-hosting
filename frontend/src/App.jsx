
import { useState } from "react";

const plans = [
  { name: "Starter", ram: "512MB", price: "0.03 LTC" },
  { name: "Creator", ram: "1GB", price: "0.08 LTC" },
  { name: "Infinity", ram: "4GB", price: "0.18 LTC" },
];

export default function App() {
  const [bots] = useState([
    { name: "Bitsy", status: "Online", lang: "Node.js" },
    { name: "Ocean AI", status: "Sleeping", lang: "Python" },
  ]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <h1>Sutra Hosting</h1>
          <p className="sub">Powered by Sutra Development</p>
        </div>

        <nav>
          <button>Dashboard</button>
          <button>Bots</button>
          <button>Plans</button>
          <button>Billing</button>
        </nav>

        <div className="discordBox">
          <h3>Discord Login</h3>
          <button className="discordBtn">
            Continue with Discord
          </button>
          <small>OAuth2 ready backend included</small>
        </div>
      </aside>

      <main className="content">
        <header className="hero">
          <div>
            <span className="tag">IMMERSIVE CLOUD HOSTING</span>
            <h2>Deploy Discord bots in seconds.</h2>
            <p>
              Sutra Hosting delivers fast bot hosting with LTC payments,
              Discord authentication, and modern deployment controls.
            </p>
          </div>

          <div className="heroCard">
            <h3>Live Cluster</h3>
            <div className="pulse"></div>
            <p>12 Nodes Online</p>
          </div>
        </header>

        <section className="grid">
          {plans.map((plan) => (
            <div className="card" key={plan.name}>
              <h3>{plan.name}</h3>
              <p>{plan.ram} RAM</p>
              <strong>{plan.price}</strong>
              <button>Buy with LTC</button>
            </div>
          ))}
        </section>

        <section className="bots">
          <div className="titleRow">
            <h3>Your Bots</h3>
            <button>Deploy Bot</button>
          </div>

          {bots.map((bot) => (
            <div className="botRow" key={bot.name}>
              <div>
                <strong>{bot.name}</strong>
                <p>{bot.lang}</p>
              </div>

              <span className={bot.status === "Online" ? "online" : "sleep"}>
                {bot.status}
              </span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
