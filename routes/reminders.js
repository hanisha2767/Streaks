const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");
const auth = require("../middleware/authMiddleware");

// ADD REMINDER
// POST /reminders/add
router.post("/add", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, reminderDate, reminderTime } = req.body;

    const { data, error } = await supabase
      .from("reminders")
      .insert([
        {
          user_id: userId,
          title,
          reminder_date: reminderDate,
          reminder_time: reminderTime,
          completed: false
        }
      ])
      .select();

    if (error) return res.status(500).json({ msg: error.message });

    res.json({ msg: "Reminder added", reminder: data[0] });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// GET REMINDERS
// GET /reminders/list
router.get("/list", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", userId)
      .order("reminder_date", { ascending: true });

    if (error) return res.status(500).json({ msg: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ message: "Reminder deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { title, reminder_date, reminder_time } = req.body;

  try {
    const { error } = await supabase
      .from("reminders")
      .update({
        title,
        reminder_date,
        reminder_time,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ message: "Reminder updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
