const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const app = express();

//config load
require("dotenv").config(); //.env file me jo bhi data h usko load karao process file ke andar
const PORT = process.env.PORT || 4000; // port ki value nikalo env se, default port 4000

//JSON middleware
app.use(express.json());

// CORS middleware to allow frontend origin
// Read allowed origins from env (comma-separated), with sensible defaults for dev
const allowedOrigins = (process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);

// Passport config
require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());

//ab database se connect karna h, uske liye ek folder banayenge config, usme hoga database.js

//index.js me ab database import kara lenge
require("./config/database").connect();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Auth Service",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Service info endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Auth Service",
    version: "1.0.0", 
    port: PORT,
    endpoints: {
      health: "/health",
      register: "/api/v1/auth/register",
      login: "/api/v1/auth/login",
    },
  });
});

//route ko import karo and mount karo
//route naamka folder banao aur usme routes dalo
//ham ek user bana lete h aur route ko import kara lenge
const user = require("./routes/user");
app.use("/api/v1/", user); // app.use krte user ko mount kara diya api/v1 pe

//server ko activate karne ke liye
app.listen(PORT, () => {
  console.log(`App is listening at ${PORT}`);
});

//ab routes define karenge
// route kaha se ho raha ?
