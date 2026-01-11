const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("../routes/auth");
const taskRoutes = require("../routes/task");
const habitRoutes = require("../routes/habits");
const reminderRoutes = require("../routes/reminders");
const streakRoutes = require("../routes/streaks");
const focusRoutes = require("../routes/focus");

const app = express();

/* =========================
   CORS CONFIG (FIXED)
========================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://hanisha2767.github.io"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

/* =========================
   ROUTES
========================= */

app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/habits", habitRoutes);
app.use("/reminders", reminderRoutes);
app.use("/streaks", streakRoutes);
app.use("/dashboard", streakRoutes);
app.use("/focus", focusRoutes);

/* =========================
   TEST ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("Backend is alive 🚀");
});

const supabase = require("./supabaseClient");

app.get("/test-supabase", async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .limit(1);

  if (error) {
    return res.status(500).json({
      message: "Supabase connection failed ❌",
      error: error.message
    });
  }

  res.json({
    message: "Supabase connected successfully ✅",
    data
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
