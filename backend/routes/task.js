const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const supabase = require("../src/supabaseClient");

/* ===============================
   HELPER: format DB → frontend
================================ */
function formatTask(row) {
  return {
    id: row.id,
    title: row.title,
    duration: row.focus_time,
    dueDate: row.due_date,
    quadrant: row.quadrant,
    completed: row.completed === true,
    archived: row.archived === true,
  };
}

/* ===============================
   GET ALL TASKS (ACTIVE ONLY)
   GET /tasks
================================ */
router.get("/", auth, async (req, res) => {
  const showAll = req.query.all === "true";
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", req.user.id);

  if (!showAll) {
    query = query.eq("archived", false);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return res.status(500).json({ msg: error.message });

  res.json(data.map(formatTask));
});

/* ===============================
   ADD TASK
   POST /tasks
================================ */
router.post("/", auth, async (req, res) => {
  // ✅ MATCH FRONTEND PAYLOAD
  const { title, focus_time, due_date, quadrant, completed } = req.body;

  if (!title || !focus_time || !quadrant) {
    return res.status(400).json({ msg: "Missing required fields" });
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        user_id: req.user.id,        // 🔥 REQUIRED
        title,
        focus_time: Number(focus_time),
        due_date: due_date || null,
        quadrant,
        completed: completed ?? false,
        archived: false,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("SUPABASE ERROR:", error);
    return res.status(500).json({ msg: error.message });
  }

  res.json(formatTask(data));
});

/* ===============================
   UPDATE TASK
   PUT /tasks/:id
================================ */
router.put("/:id", auth, async (req, res) => {
  const updates = {};
  const body = req.body;

  if (body.title !== undefined) updates.title = body.title;
  if (body.focus_time !== undefined) updates.focus_time = body.focus_time;
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.quadrant !== undefined) updates.quadrant = body.quadrant;
  if (body.completed !== undefined) updates.completed = body.completed;
  if (body.archived !== undefined) updates.archived = body.archived;

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ msg: error.message });

  res.json(formatTask(data));
});

/* ===============================
   DELETE TASK → ARCHIVE
   DELETE /tasks/:id
================================ */
router.delete("/:id", auth, async (req, res) => {
  const { error } = await supabase
    .from("tasks")
    .update({ archived: true })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ msg: error.message });

  res.json({ msg: "Task archived" });
});

module.exports = router;
