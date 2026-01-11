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
    matrixType: {
      type: String,  // q1, q2, q3, q4
      default: "q1"
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
