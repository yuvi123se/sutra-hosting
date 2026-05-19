from pathlib import Path

app = r'''import { useEffect, useState } from "react";

const API_URL = "https://sutra-api-ldhf.onrender.com";

const plans = [
  {
    name: "Starter",
    ram: "512MB RAM",
    price: "0.03 LTC",
    features: ["1 Bot", "Basic Hosting", "24/7 Uptime"],
  },
  {
    name: "Creator",
    ram: "1GB RAM",
    price: "0.08 LTC",
    features: ["5 Bots", "Priority Node", "Fast CPU"],
  },
  {
    name: "Infinity",
    ram: "4GB RAM",
    price: "0.18 LTC",
    features: ["Unlimited Bots", "Dedicated Power", "Premium Support"],
  },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [status, setStatus] = useState("Checking...");
  const [message, setMessage] = useState("");

  const [bots, setBots] = useState([
    { name: "Bitsy", lang: "Node.js", status: "Online" },
    { name: "Ocean AI", lang: "Python", status: "Sleeping" },
  ]);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status || "Online");
      })
      .catch(() => {
        setStatus("Offline");
      });
  }, []);

  function deployBot() {
    const newBot = {
      name: "New Bot " + (bots.length + 1),
      lang: "Node.js",
      status: "Online",
    };

    setBots([...bots, newBot]);
    setMessage("Bot deployed successfully.");
  }

  function buyPlan(plan) {
    setMessage(`Selected ${plan.name} plan.`);
  }

  function discordLogin() {
    window.open(`${API_URL}/auth/discord`, "_blank");
  }

  if (!loggedIn) {
    return (
      <div className="loginScreen">
        <div className="bgGlow"></div>

        <div className="loginCard">
          <h1>Sutra Hosting</h1>

          <p>
            Modern immersive Discord bot hosting by Sutra Development.
          </p>

          <button onClick={() => setLoggedIn(true)}>
            Enter Dashboard
          </button>

          <button className="discord" onClick={discordLogin}>
            Login with Discord
          </button>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div>
            <h1>Sutra</h1>
            <span>Hosting Panel</span>
          </div>

          <nav>
            <button onClick={() => setPage("dashboard")}>
              Dashboard
            </button>

            <button onClick={() => setPage("bots")}>
              Bots
            </button>

            <button onClick={() => setPage("plans")}>
              Plans
            </button>

            <button onClick={() => setPage("billing")}>
              Billing
            </button>
          </nav>

          <div className="statusCard">
            <p>Backend Status</p>
            <strong>{status}</strong>
          </div>
        </aside>

        <main className="content">
          <header className="hero">
            <div>
              <span className="tag">
                NEXT GEN CLOUD HOSTING
              </span>

              <h2>Deploy Discord bots instantly.</h2>

              <p>
                Powerful cloud hosting with LTC payments,
                immersive UI and Discord authentication.
              </p>

              <div className="heroButtons">
                <button onClick={deployBot}>
                  Deploy Bot
                </button>

                <button
                  className="secondary"
                  onClick={discordLogin}
                >
                  Discord Login
                </button>
              </div>
            </div>

            <div className="liveCard">
              <div className="circle"></div>

              <h3>Cluster Online</h3>

              <p>12 Nodes Active</p>
            </div>
          </header>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          {(page === "dashboard" || page === "plans") && (
            <section className="plansGrid">
              {plans.map((plan) => (
                <div className="planCard" key={plan.name}>
                  <h3>{plan.name}</h3>

                  <span>{plan.ram}</span>

                  <strong>{plan.price}</strong>

                  <div className="features">
                    {plan.features.map((f) => (
                      <p key={f}>✓ {f}</p>
                    ))}
                  </div>

                  <button onClick={() => buyPlan(plan)}>
                    Buy with LTC
                  </button>
                </div>
              ))}
            </section>
          )}

          {(page === "dashboard" || page === "bots") && (
            <section className="bots">
              <div className="title">
                <h3>Your Bots</h3>

                <button onClick={deployBot}>
                  Add Bot
                </button>
              </div>

              {bots.map((bot) => (
                <div className="botCard" key={bot.name}>
                  <div>
                    <strong>{bot.name}</strong>
                    <p>{bot.lang}</p>
                  </div>

                  <div className="actions">
                    <span
                      className={
                        bot.status === "Online"
                          ? "online"
                          : "sleep"
                      }
                    >
                      {bot.status}
                    </span>

                    <button
                      onClick={() =>
                        setMessage(
                          `${bot.name} restarted successfully.`
                        )
                      }
                    >
                      Restart
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {page === "billing" && (
            <section className="billing">
              <h2>Billing</h2>

              <div className="billCard">
                <p>Current Plan</p>
                <strong>Creator</strong>
              </div>

              <div className="billCard">
                <p>Payment Method</p>
                <strong>Litecoin (LTC)</strong>
              </div>
            </section>
          )}
        </main>
      </div>

      <style>{styles}</style>
    </>
  );
}

const styles = `
*{
margin:0;
padding:0;
box-sizing:border-box;
font-family:Inter,sans-serif;
}

body{
background:#050816;
color:white;
overflow-x:hidden;
}

button{
cursor:pointer;
transition:.25s;
}

.loginScreen{
height:100vh;
display:flex;
align-items:center;
justify-content:center;
background:#050816;
position:relative;
overflow:hidden;
}

.bgGlow{
position:absolute;
width:600px;
height:600px;
background:#4f7cff;
filter:blur(140px);
opacity:.25;
}

.loginCard{
position:relative;
z-index:2;
background:rgba(18,25,45,.85);
padding:50px;
border-radius:28px;
border:1px solid rgba(255,255,255,.08);
backdrop-filter:blur(20px);
width:420px;
text-align:center;
box-shadow:0 0 40px rgba(0,0,0,.45);
}

.loginCard h1{
font-size:42px;
margin-bottom:10px;
}

.loginCard p{
color:#9ba7d6;
margin-bottom:25px;
line-height:1.6;
}

.loginCard button{
width:100%;
padding:15px;
border:none;
border-radius:16px;
background:#4f7cff;
color:white;
font-weight:700;
margin-top:14px;
font-size:15px;
}

.loginCard .discord{
background:#5865F2;
}

.loginCard button:hover{
transform:translateY(-2px);
}

.app{
display:flex;
min-height:100vh;
background:#050816;
}

.sidebar{
width:260px;
background:#0c1224;
border-right:1px solid rgba(255,255,255,.06);
padding:28px;
display:flex;
flex-direction:column;
justify-content:space-between;
}

.sidebar h1{
font-size:34px;
}

.sidebar span{
color:#7f8dbd;
}

nav{
display:flex;
flex-direction:column;
gap:12px;
margin-top:40px;
}

nav button{
padding:14px;
border:none;
border-radius:16px;
background:#141d37;
color:white;
font-weight:600;
}

nav button:hover{
background:#4f7cff;
transform:translateX(4px);
}

.statusCard{
background:#121a31;
padding:18px;
border-radius:20px;
}

.statusCard p{
color:#8ea0d8;
margin-bottom:6px;
}

.content{
flex:1;
padding:35px;
}

.hero{
display:flex;
justify-content:space-between;
gap:30px;
padding:35px;
border-radius:30px;
background:linear-gradient(135deg,#121c3d,#1c2f67);
align-items:center;
box-shadow:0 0 40px rgba(0,0,0,.3);
}

.tag{
color:#87a7ff;
font-size:13px;
letter-spacing:2px;
}

.hero h2{
font-size:52px;
margin:12px 0;
max-width:600px;
}

.hero p{
max-width:620px;
color:#b7c4f3;
line-height:1.7;
}

.heroButtons{
display:flex;
gap:14px;
margin-top:22px;
}

.heroButtons button{
padding:14px 22px;
border:none;
border-radius:16px;
background:#4f7cff;
color:white;
font-weight:700;
}

.heroButtons .secondary{
background:#1a2447;
}

.heroButtons button:hover{
transform:translateY(-3px);
}

.liveCard{
width:240px;
padding:25px;
background:#0f1730;
border-radius:28px;
text-align:center;
}

.circle{
width:110px;
height:110px;
border-radius:50%;
background:#4f7cff;
margin:auto;
margin-bottom:18px;
box-shadow:0 0 45px #4f7cff;
animation:pulse 2s infinite;
}

@keyframes pulse{
0%{transform:scale(1);}
50%{transform:scale(1.08);}
100%{transform:scale(1);}
}

.message{
margin-top:22px;
padding:16px;
background:#111a32;
border-radius:18px;
color:#9bc1ff;
}

.plansGrid{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
gap:22px;
margin-top:30px;
}

.planCard{
background:#10182f;
padding:28px;
border-radius:26px;
border:1px solid rgba(255,255,255,.06);
transition:.3s;
}

.planCard:hover{
transform:translateY(-6px);
border-color:#4f7cff;
}

.planCard h3{
font-size:28px;
margin-bottom:8px;
}

.planCard span{
color:#8fa2dc;
}

.planCard strong{
display:block;
font-size:36px;
margin:18px 0;
}

.features{
margin-bottom:20px;
}

.features p{
margin-bottom:10px;
color:#b8c6f5;
}

.planCard button{
width:100%;
padding:14px;
border:none;
border-radius:16px;
background:#4f7cff;
color:white;
font-weight:700;
}

.bots{
margin-top:35px;
}

.title{
display:flex;
justify-content:space-between;
margin-bottom:20px;
}

.title button{
padding:12px 18px;
border:none;
border-radius:14px;
background:#4f7cff;
color:white;
font-weight:700;
}

.botCard{
display:flex;
justify-content:space-between;
align-items:center;
padding:22px;
background:#10182f;
border-radius:22px;
margin-bottom:18px;
}

.botCard strong{
font-size:20px;
}

.botCard p{
color:#90a0d4;
margin-top:4px;
}

.actions{
display:flex;
align-items:center;
gap:14px;
}

.actions button{
padding:12px 16px;
border:none;
border-radius:14px;
background:#1b2649;
color:white;
}

.online{
color:#5dff98;
font-weight:700;
}

.sleep{
color:#ffb95c;
font-weight:700;
}

.billing{
margin-top:35px;
}

.billCard{
margin-top:18px;
background:#10182f;
padding:22px;
border-radius:20px;
}

.billCard p{
color:#8ea0d8;
margin-bottom:6px;
}

.billCard strong{
font-size:26px;
}

@media(max-width:900px){
.app{
flex-direction:column;
}

.sidebar{
width:100%;
}

.hero{
flex-direction:column;
text-align:center;
}

.hero h2{
font-size:38px;
}

.heroButtons{
justify-content:center;
}

.liveCard{
width:100%;
}
}
`;
'''

path = Path("/mnt/data/Smooth-App.jsx")
path.write_text(app)

print("Created:", path)
