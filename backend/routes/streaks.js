const express = require("express");
const router = express.Router();
const supabase = require("../src/supabaseClient");
const auth = require("../middleware/authMiddleware");
const { calculateStreaks } = require("../utils/streakUtils");

/* =========================================
   DASHBOARD SUMMARY
   GET /dashboard/summary
========================================= */
router.get("/summary", auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const todayDate = new Date().toISOString().split("T")[0];

    /* ---------- TODOS ---------- */
    const { count: todos } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("archived", false)
      .eq("completed", false);

    /* ---------- HABITS (ALL ACTIVE HABITS) ---------- */
    /* ---------- HABITS (ALL ACTIVE HABITS) ---------- */
    const { data: habitsData, count: habits } = await supabase
      .from("habits")
      .select("id, name, completed_dates", { count: "exact" })
      .eq("user_id", userId)
      .eq("completed", true);

    /* ---------- HABITS COMPLETED TODAY ---------- */
    let habitCompleted = 0;

    for (const habit of habitsData || []) {
      if ((habit.completed_dates || []).includes(todayDate)) {
        habitCompleted++;
      }
    }

    /* ---------- HABIT STREAKS ---------- */
    const habitStreaks = [];

    for (const habit of habitsData || []) {
      const dates = habit.completed_dates || [];
      const streak = calculateStreaks(dates).current || 0;

      habitStreaks.push({
        name: habit.name,
        streak,
      });
    }

    /* ---------- REMINDERS COUNT ---------- */
    const { count: reminders } = await supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", false)
      .gte("reminder_date", todayDate);

    /* ---------- UPCOMING REMINDERS LIST ---------- */
    const { data: reminderList } = await supabase
      .from("reminders")
      .select("id, title, reminder_date")
      .eq("user_id", userId)
      .eq("completed", false)
      .gte("reminder_date", todayDate)
      .order("reminder_date", { ascending: true })
      .limit(5);

    /* ---------- RESPONSE ---------- */
    res.json({
      todos: todos || 0,
      habits: habits || 0,
      habitCompleted,
      reminders: reminders || 0,
      habitStreaks,
      reminderList: (reminderList || []).map(r => ({
        id: r.id,
        title: r.title,
        date: r.reminder_date,
      })),
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ msg: "Dashboard summary failed" });
  }
});

module.exports = router;

