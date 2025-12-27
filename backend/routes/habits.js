const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");

const today = () => new Date().toISOString().split("T")[0];

/* ===========================
   GET ALL HABITS
=========================== */
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from("habits")
    .select("id, name, completed_dates, completed")
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });

  res.json(
    data.map(h => ({
      id: h.id,
      name: h.name,
      completedDates: h.completed_dates || [],
      deleted: h.completed === false,
    }))
  );
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
