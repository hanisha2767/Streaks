const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");
const { calculateStreaks } = require("../utils/streakUtils");

/* =========================================
   DASHBOARD SUMMARY
   GET /dashboard/summary
========================================= */
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Todos count
    const { count: todoCount, error: todoError } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", false);

    if (todoError) throw todoError;

    // Habits count
    const { count: habitCount, error: habitError } = await supabase
      .from("habits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (habitError) throw habitError;

    // Reminders count
    const { count: reminderCount, error: reminderError } = await supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", false);

    if (reminderError) throw reminderError;

    res.json({
      todos: todoCount || 0,
      habits: habitCount || 0,
      reminders: reminderCount || 0,
    });
  } catch (err) {
    console.error("Dashboard summary error:", err.message);
    res.status(500).json({ msg: "Failed to load dashboard summary" });
  }
});

/* =========================================
   HABIT STREAK
   GET /dashboard/:habitId
========================================= */
router.get("/:habitId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.habitId;

    const { data, error } = await supabase
      .from("habit_completions")
      .select("completed_date")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .order("completed_date", { ascending: true });

    if (error) {
      return res.status(500).json({ msg: error.message });
    }

    const dates = data.map(d => d.completed_date);
    const streaks = calculateStreaks(dates);

    res.json(streaks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
