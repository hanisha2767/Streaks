const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ""
    },
    dueDate: {
      type: String,   // from your date input
      default: ""
    },
    priority: {
      type: String,   // HIGH | MEDIUM | LOW
      default: "LOW"
    },
    focusTime: {
      type: Number,   // minutes
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
