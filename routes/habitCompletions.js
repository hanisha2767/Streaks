const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");
const auth = require("../middleware/authMiddleware");

// MARK HABIT COMPLETED (TODAY)
// POST /habit-completions/complete

router.post("/complete", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { habitId, date } = req.body;

    const completedDate = date || new Date().toISOString().split("T")[0];

    // prevent duplicate completion for same day
    const { data: existing } = await supabase
      .from("habit_completions")
      .select("id")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .eq("completed_date", completedDate)
      .single();

    if (existing) {
      return res.status(400).json({ msg: "Habit already completed today" });
    }

    const { data, error } = await supabase
      .from("habit_completions")
      .insert([
        {
          habit_id: habitId,
          user_id: userId,
          completed_date: completedDate,
          completed_at: new Date()
        }
      ])
      .select();

    if (error) return res.status(500).json({ msg: error.message });

    res.json({ msg: "Habit marked completed", completion: data[0] });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// GET COMPLETIONS FOR A HABIT
// GET /habit-completions/:habitId

router.get("/:habitId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.habitId;

    const { data, error } = await supabase
      .from("habit_completions")
      .select("*")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .order("completed_date", { ascending: false });

    if (error) return res.status(500).json({ msg: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
