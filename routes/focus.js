const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// TEMP in-memory store (can move to DB later)
const focusData = {};

/**
 * GET /focus/weekly
 * Returns focus minutes for last 7 days
 */
router.get("/weekly", authMiddleware, (req, res) => {
  const userId = req.user.id;

  const today = new Date();
  const result = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);

    result[key] = focusData[userId]?.[key] || 0;
  }

  res.json(result);
});

/**
 * POST /focus
 * body: { minutes }
 */
router.post("/", authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { minutes } = req.body;

  const todayKey = new Date().toISOString().slice(0, 10);

  if (!focusData[userId]) focusData[userId] = {};
  focusData[userId][todayKey] =
    (focusData[userId][todayKey] || 0) + Number(minutes || 0);

  res.json({ success: true });
});

module.exports = router;
