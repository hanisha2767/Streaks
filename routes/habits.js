const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");

/* ===========================
   GET ALL HABITS
   GET /habits
=========================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   ADD HABIT
   POST /habits
=========================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const { data, error } = await supabase
      .from("habits")
      .insert([{ name, user_id: userId, completed_dates: [], streak: 0 }])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   COMPLETE HABIT (TODAY)
   POST /habits/:id/complete
=========================== */
router.post("/:id/complete", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    const { data, error } = await supabase
      .from("habits")
      .select("completed_dates")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    const dates = data.completed_dates || [];
    if (!dates.includes(today)) dates.push(today);

    const { error: updateError } = await supabase
      .from("habits")
      .update({
        completed_dates: dates,
        streak: dates.length,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (updateError) throw updateError;

    res.json({ message: "Habit completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   RESET TODAY
   POST /habits/:id/reset
=========================== */
router.post("/:id/reset", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const today = new Date().toISOString().split("T")[0];

  try {
    const { data, error } = await supabase
      .from("habits")
      .select("completed_dates")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    const updated = (data.completed_dates || []).filter(d => d !== today);

    const { error: updateError } = await supabase
      .from("habits")
      .update({
        completed_dates: updated,
        streak: updated.length,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (updateError) throw updateError;

    res.json({ message: "Today reset" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   UPDATE HABIT
   PUT /habits/:id
=========================== */
router.put("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  try {
    const { error } = await supabase
      .from("habits")
      .update({ name })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ message: "Habit updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   DELETE HABIT
   DELETE /habits/:id
=========================== */
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ message: "Habit deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
