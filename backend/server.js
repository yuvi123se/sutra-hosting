
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_,res)=>{
  res.json({
    name:"Sutra Hosting API",
    status:"online"
  });
});

// Discord OAuth placeholder
app.get("/auth/discord", (_,res)=>{
  res.json({
    message:"Connect your Discord OAuth URL here."
  });
});

// Example deploy route
app.post("/deploy", (req,res)=>{
  const { botName, runtime } = req.body;

  res.json({
    success:true,
    message:`Deployment queued for ${botName}`,
    runtime
  });
});

app.listen(3001, ()=>{
  console.log("Backend running on port 3001");
});
