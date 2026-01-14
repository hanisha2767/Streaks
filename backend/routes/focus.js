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

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 6); // last 7 days

    const { data, error } = await supabase
      .from("focus_sessions")
      .select("date, minutes")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", today.toISOString().split("T")[0]);

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

    const result = days.map(day => ({
      day,
      minutes: map[day] || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


/* ===============================
   DECREMENT FOCUS SESSION
   POST /focus/decrement
================================ */
router.post("/decrement", authMiddleware, async (req, res) => {
  try {
    const { minutes } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split("T")[0];

    if (!minutes || minutes <= 0) {
      return res.status(400).json({ msg: "Minutes required" });
    }

    // Since focus_sessions is a history log, we add a negative entry
    // to "undo" the minutes added earlier. 
    // This allows the weekly summary to correctly reflect the subtraction.
    const { error } = await supabase
      .from("focus_sessions")
      .insert([
        {
          user_id: userId,
          minutes: -Number(minutes),
          date: today,
        },
      ]);

    if (error) {
      return res.status(500).json({ msg: error.message });
    }

    res.json({ msg: "Focus minutes decremented" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
