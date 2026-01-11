const express = require("express");
const router = express.Router();
const supabase = require("../src/supabaseClient");
const auth = require("../middleware/authMiddleware");

// ===============================
// REGISTER (Supabase)
// POST /auth/register
// ===============================
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.status(201).json({
    message: "Signup successful",
    user: data.user,
    session: data.session,
    token: data.session?.access_token,
  });
});

// ===============================
// LOGIN (Supabase)
// POST /auth/login
// ===============================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.json({
    message: "Login successful",
    user: data.user,
    session: data.session,
    token: data.session.access_token,
  });
});

// ===============================
// GET CURRENT USER
// GET /auth/me
// ===============================
router.get("/me", auth, (req, res) => {
  res.json(req.user);
});

// ===============================
// LOGOUT (handled on frontend)
// ===============================
router.post("/logout", (req, res) => {
  res.json({ message: "Logout handled on client" });
});

module.exports = router;
