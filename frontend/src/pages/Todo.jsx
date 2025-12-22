import { useEffect, useState } from "react";
import { getTodos, addTodo, completeTodo, updateTodo, deleteTodo } from "../api";

/* ================= HELPERS ================= */

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function isOverdue(task) {
  if (!task.due_date || task.completed) return false;
  const today = new Date().toISOString().split("T")[0];
  return task.due_date < today;
}

/* ================= MAIN ================= */

function Todo() {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newTask, setNewTask] = useState({
    title: "",
    duration: "",
    due_date: "",
    quadrant: 1,
  });

  /* LOAD TASKS FROM BACKEND */
  useEffect(() => {
    loadTasks();
  }, []);
  

  async function loadTasks() {
    try {
      const data = await getTodos();
      setTasks(data);
    } catch (err) {
      console.error("Load tasks error:", err.message);
    }
  }

  /* ADD TASK */
  async function handleSaveTask() {
   try {
     if (editingId) {
       await updateTodo(editingId, newTask);
      } else {
         await addTodo(newTask);
      }

      setNewTask({
        title: "",
        duration: "",
        due_date: "",
        quadrant: 1,
      });
      setEditingId(null);
      setShowModal(false);
      loadTasks();
    } catch (err) {
        console.error("Save task error:", err.message);
    }
  }


  /* COMPLETE TASK */
  async function toggleDone(id) {
    try {
      await completeTodo(id);
      loadTasks();
    } catch (err) {
      console.error("Complete task error:", err.message);
    }
  }

  async function handleDelete(id) {
    const confirm = window.confirm("Delete this task?");
    if (!confirm) return;

    try {
      await deleteTodo(id);
      loadTasks();
    } catch (err) {
       console.error("Delete task error:", err.message);
    }
  }

  async function handleDrop(e, newQuadrant) {
  e.preventDefault();

  const data = JSON.parse(
    e.dataTransfer.getData("task")
  );

  try {
    await updateTodo(data.id, { quadrant: newQuadrant });
    loadTasks();
  } catch (err) {
    console.error("Drag update failed:", err.message);
  }
}

  return (
    <div className="todo-page">
      <h1 className="todo-title">To Do List</h1>

      <div className="todo-actions">
        <input className="todo-search" placeholder="Search tasks..." />

        <div className="todo-filters">
          <button className="todo-filter active">All</button>
          <button className="todo-filter">Today</button>
          <button className="todo-filter">Overdue</button>
        </div>

        <button
          className="matrix-add-btn"
          onClick={() => {
            setEditingTask(null);
            setShowModal(true);
          }}
        >
          + New Task
        </button>
      </div>

      <div className="matrix-grid">
        {renderBox(1, "Urgent & Important", tasks, toggleDone, setEditingId, setNewTask, setShowModal, handleDelete, handleDrop)}
        {renderBox(2, "Not Urgent & Important", tasks, toggleDone, setEditingId, setNewTask, setShowModal, handleDelete, handleDrop)}
        {renderBox(3, "Urgent & Not Important", tasks, toggleDone, setEditingId, setNewTask, setShowModal, handleDelete, handleDrop)}
        {renderBox(4, "Not Urgent & Not Important", tasks, toggleDone, setEditingId, setNewTask, setShowModal, handleDelete, handleDrop)}
      </div>

      {/* ========== MODAL ========== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit Task" : "New Task"}</h2>

            <div className="form-row">
              <label>Task Name</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <label>Duration (mins)</label>
              <input
                type="number"
                value={newTask.duration}
                onChange={(e) =>
                  setNewTask({ ...newTask, duration: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <label>Due Date</label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) =>
                  setNewTask({ ...newTask, due_date: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <label>Quadrant</label>
              <select
                value={newTask.quadrant}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    quadrant: Number(e.target.value),
                  })
                }
              >
                <option value={1}>Urgent & Important</option>
                <option value={2}>Not Urgent & Important</option>
                <option value={3}>Urgent & Not Important</option>
                <option value={4}>Not Urgent & Not Important</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button className="save-btn" onClick={handleSaveTask}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= MATRIX BOX ================= */

function renderBox(
  q,
  title,
  tasks,
  toggleDone,
  setEditingId,
  setNewTask,
  setShowModal,
  handleDelete,
  handleDrop
) {
  const filtered = tasks.filter((t) => t.quadrant === q);

  return (
    <div
  className="matrix-box"
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => handleDrop(e, q)}
>
      <h2>{title}</h2>

      <ul className="matrix-list">
        {filtered.length === 0 && <p>No tasks</p>}

        {filtered.map((task) => (
          <li
  key={task.id}
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData(
      "task",
      JSON.stringify({ id: task.id })
    );
  }}
  className={`matrix-task 
    ${task.completed ? "done" : ""} 
    ${isOverdue(task) ? "overdue" : ""}
  `}
>
            <div className="matrix-task-row">
              <div className="task-left">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleDone(task.id)}
                />
                <span className="task-name">{task.title}</span>
              </div>
            </div>

            <div className="task-meta">
  <span className={`due-date ${isOverdue(task) ? "overdue" : ""}`}>
    📅 {formatDate(task.due_date)}
  </span>
  <span className="duration">⏱ {task.duration} min</span>

  <div className="task-actions">
    <span
      className="edit"
      onClick={() => {
        setEditingId(task.id);
        setNewTask({
          title: task.title,
          duration: task.duration || "",
          due_date: task.due_date || "",
          quadrant: task.quadrant || q,
        });
        setShowModal(true);
      }}
    >
      Edit
    </span>

    <span
      className="delete"
      onClick={() => handleDelete(task.id)}
    >
      Delete
    </span>
  </div>
</div>

          </li>
        ))}
      </ul>
    </div>
  );
}

export default Todo;
