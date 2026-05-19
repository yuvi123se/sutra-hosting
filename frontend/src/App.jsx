import { useEffect, useState } from "react";

const API_URL = "https://sutra-api-ldhf.onrender.com";

const plans = [
  {
    name: "Starter",
    ram: "512MB RAM",
    price: "0.03 LTC",
  },
  {
    name: "Creator",
    ram: "1GB RAM",
    price: "0.08 LTC",
  },
  {
    name: "Infinity",
    ram: "4GB RAM",
    price: "0.18 LTC",
  },
];

export default function App() {
  const [status, setStatus] = useState("Checking...");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status);
      })
      .catch(() => {
        setStatus("Offline");
      });
  }, []);

  if (!loggedIn) {
    return (
      <div className="login">
        <h1>Sutra Hosting</h1>

        <p>Immersive Discord bot hosting platform.</p>

        <button onClick={() => setLoggedIn(true)}>
          Enter Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Sutra</h1>

        <button>Dashboard</button>
        <button>Bots</button>
        <button>Plans</button>
      </aside>

      <main className="content">
        <div className="hero">
          <h2>Deploy Discord bots instantly.</h2>

          <p>Backend Status: {status}</p>
        </div>

        <div className="plans">
          {plans.map((plan) => (
            <div className="card" key={plan.name}>
              <h3>{plan.name}</h3>

              <p>{plan.ram}</p>

              <strong>{plan.price}</strong>

              <button>Buy with LTC</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
