const express = require("express");
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

// ADD TASK
router.post("/add", authMiddleware, async (req, res) => {
    try {
        const { title, description, dueDate, priority, focusTime } = req.body;

        const task = new Task({
            userId: req.user.id,
            title,
            description,
            dueDate,
            priority,
            focusTime
        });

        await task.save();
        res.json({ msg: "Task added", task });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});


// GET USER TASKS
router.get("/list", auth, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

// DELETE TASK
router.delete("/delete/:id", auth, async (req, res) => {
    try {
        await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ msg: "Task deleted" });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

// MARK TASK COMPLETE
router.patch("/complete/:id", auth, async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { completed: true },
            { new: true }
        );
        res.json({ msg: "Task completed", task });
    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
