const express = require("express");
const router = express.Router();
const supabase = require("../src/supabaseClient");
const auth = require("../middleware/authMiddleware");

// ===============================
// HELPER: Ensure User Profile
// ===============================
async function ensureProfile(user) {
  if (!user) return;
  const username = user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email,
      username: username,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Profile sync error:", error.message);
  }
}

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

  // ✅ SYNC PROFILE
  await ensureProfile(data.user);

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

  // ✅ BACKFILL/SYNC PROFILE
  await ensureProfile(data.user);

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
