const express = require("express");
const router = express.Router();
const supabase = require("../src/supabaseClient");
const authMiddleware = require("../middleware/authMiddleware");

/* ===============================
   ADD FOCUS SESSION
   POST /focus
================================ */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { minutes } = req.body;

    if (!minutes || minutes <= 0) {
      return res.status(400).json({ msg: "Minutes required" });
    }

    const { error } = await supabase
      .from("focus_sessions")
      .insert([
        {
          user_id: req.user.id,
          minutes,
          date: new Date().toISOString().split("T")[0],
        },
      ]);

    if (error) {
      return res.status(500).json({ msg: error.message });
    }

    res.json({ msg: "Focus session added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===============================
   GET WEEKLY FOCUS HOURS
   GET /focus/weekly
================================ */
router.get("/weekly", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("focus_sessions")
      .select("date, minutes")
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ msg: error.message });
    }

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = {};

    data.forEach(row => {
      const d = new Date(row.date);
      const day = days[d.getDay()];
      map[day] = (map[day] || 0) + row.minutes;
    });

    const result = Object.keys(map).map(day => ({
      day,
      minutes: map[day],
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
