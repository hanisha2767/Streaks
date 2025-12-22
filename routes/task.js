const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");
const auth = require("../middleware/authMiddleware");

// ===============================
// ADD TASK
// POST /tasks/add
// ===============================
router.post("/add", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, dueDate, focusTime, category } = req.body;

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          user_id: userId,
          name,
          due_date: dueDate,
          focus_time: focusTime,
          category,
          completed: false
        }
      ])
      .select();

    if (error) {
      return res.status(500).json({ msg: error.message });
    }

    res.json({ msg: "Task added", task: data[0] });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ===============================
// GET USER TASKS
// GET /tasks/list
// ===============================
router.get("/list", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ msg: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ===============================
// DELETE TASK
// DELETE /tasks/delete/:id
// ===============================
router.delete("/delete/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ msg: error.message });
    }

    res.json({ msg: "Task deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ===============================
// MARK TASK COMPLETE
// PATCH /tasks/complete/:id
// ===============================
router.patch("/complete/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed: true })
      .eq("id", taskId)
      .eq("user_id", userId)
      .select();

    if (error) {
      return res.status(500).json({ msg: error.message });
    }

    res.json({ msg: "Task completed", task: data[0] });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
