const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");
const { calculateStreaks } = require("../utils/streakUtils");

const today = () => new Date().toISOString().split("T")[0];

/* ===========================
   GET ALL HABITS
=========================== */
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;
  const showAll = req.query.all === "true";

  let query = supabase
    .from("habits")
    .select("id, name, completed_dates, completed")
    .eq("user_id", userId);

  if (!showAll) {
    query = query.eq("completed", true);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const habitsWithStreaks = data.map(h => {
    const dates = h.completed_dates || [];
    const streak = calculateStreaks(dates).current || 0;

    return {
      id: h.id,
      name: h.name,
      completedDates: dates,
      streak,
      completed: h.completed,
      deleted: h.completed === false
    };
  });

  res.json(habitsWithStreaks);
});


/* ===========================
   ADD HABIT
=========================== */
router.post("/", auth, async (req, res) => {
  const { name } = req.body;

  const { data, error } = await supabase
    .from("habits")
    .insert([
      {
        user_id: req.user.id,
        name,
        completed_dates: [],
        completed: true,
      },
    ])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    id: data.id,
    name: data.name,
    completedDates: [],
    deleted: false,
  });
  console.log("POST /habits HIT", req.user.id);

});

/* ===========================
   TOGGLE TODAY
=========================== */
router.post("/:id/toggle", auth, async (req, res) => {
  const habitId = req.params.id;
  const todayDate = today();

  const { data } = await supabase
    .from("habits")
    .select("completed_dates")
    .eq("id", habitId)
    .eq("user_id", req.user.id)
    .single();

  let dates = data.completed_dates || [];

  dates = dates.includes(todayDate)
    ? dates.filter(d => d !== todayDate)
    : [...dates, todayDate];

  await supabase
    .from("habits")
    .update({ completed_dates: dates })
    .eq("id", habitId)
    .eq("user_id", req.user.id);

  res.json({ completedDates: dates });
});

/* ===========================
   UPDATE HABIT
=========================== */
router.put("/:id", auth, async (req, res) => {
  const { name, completed } = req.body;
  const habitId = req.params.id;
  const userId = req.user.id;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (completed !== undefined) updates.completed = completed;

  const { data, error } = await supabase
    .from("habits")
    .update(updates)
    .eq("id", habitId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const dates = data.completed_dates || [];
  const streak = calculateStreaks(dates).current || 0;

  res.json({
    id: data.id,
    name: data.name,
    completedDates: dates,
    streak,
  });
});

/* ===========================
   RESET TODAY
=========================== */
router.post("/reset-today", auth, async (req, res) => {
  const userId = req.user.id;
  const todayDate = today();

  try {
    // 1. Fetch all active habits
    const { data: habits, error: fetchError } = await supabase
      .from("habits")
      .select("id, completed_dates")
      .eq("user_id", userId)
      .eq("completed", true);

    if (fetchError) throw fetchError;

    // 2. Filter out today's date from each habit
    const updates = habits.map(h => {
      const newDates = (h.completed_dates || []).filter(d => d !== todayDate);
      return supabase
        .from("habits")
        .update({ completed_dates: newDates })
        .eq("id", h.id)
        .eq("user_id", userId);
    });

    await Promise.all(updates);

    res.json({ msg: "Today's progress reset" });
  } catch (err) {
    console.error("Reset today error:", err);
    res.status(500).json({ error: "Failed to reset today's progress" });
  }
});

/* ===========================
   DELETE HABIT (SOFT)
=========================== */
router.delete("/:id", auth, async (req, res) => {
  await supabase
    .from("habits")
    .update({ completed: false })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  res.json({ msg: "Habit deleted" });
});

module.exports = router;
