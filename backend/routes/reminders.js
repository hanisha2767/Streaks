const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");

/* ===========================
   GET ALL REMINDERS
=========================== */
router.get("/", auth, async (req, res) => {
  const showAll = req.query.all === "true";
  let query = supabase
    .from("reminders")
    .select("id, title, reminder_date, reminder_time, completed")
    .eq("user_id", req.user.id);

  if (!showAll) {
    query = query.eq("completed", false);
  }

  const { data, error } = await query.order("reminder_date", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json(
    data.map(r => ({
      id: r.id,
      title: r.title,
      date: r.reminder_date,
      time: r.reminder_time,
      completed: r.completed,
      deleted: r.completed === true,
    }))
  );
});

/* ===========================
   ADD REMINDER
=========================== */
router.post("/", auth, async (req, res) => {
  const { title, date, time } = req.body;

  const { data, error } = await supabase
    .from("reminders")
    .insert([
      {
        user_id: req.user.id,
        title,
        reminder_date: date,
        reminder_time: time || null,
        completed: false,
      },
    ])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    id: data.id,
    title: data.title,
    date: data.reminder_date,
    time: data.reminder_time,
    deleted: false,
  });
});

/* ===========================
   UPDATE REMINDER
=========================== */
router.put("/:id", auth, async (req, res) => {
  const { title, date, time, completed } = req.body;

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (date !== undefined) updates.reminder_date = date;
  if (time !== undefined) updates.reminder_time = time || null;
  if (completed !== undefined) updates.completed = completed;

  await supabase
    .from("reminders")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  res.json({ msg: "Reminder updated" });
});

/* ===========================
   DELETE REMINDER (SOFT)
=========================== */
router.delete("/:id", auth, async (req, res) => {
  await supabase
    .from("reminders")
    .update({ completed: true })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  res.json({ msg: "Reminder deleted" });
});

module.exports = router;
