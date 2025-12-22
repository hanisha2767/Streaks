const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

// ===============================
// GET CURRENT USER
// GET /auth/me
// ===============================
router.get("/me", auth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email
  });
});

// ===============================
// LOGOUT (handled on frontend)
// ===============================
router.post("/logout", (req, res) => {
  res.json({ msg: "Logout handled on client" });
});

module.exports = router;
