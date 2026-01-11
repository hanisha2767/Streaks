import { useEffect, useState } from "react";
import { API_BASE } from "../config";


/* ================= HELPERS ================= */
function addFocusMinutes(minutes) {
  const today = new Date().toISOString().split("T")[0];
  const data = JSON.parse(localStorage.getItem("focusHours")) || {};
  data[today] = (data[today] || 0) + Number(minutes);
  localStorage.setItem("focusHours", JSON.stringify(data));
  window.dispatchEvent(new Event("focusUpdated"));
}

function removeFocusMinutes(minutes) {
  const today = new Date().toISOString().split("T")[0];
  const data = JSON.parse(localStorage.getItem("focusHours")) || {};
  data[today] = Math.max(0, (data[today] || 0) - Number(minutes));
  localStorage.setItem("focusHours", JSON.stringify(data));
  window.dispatchEvent(new Event("focusUpdated"));
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const today = new Date().toISOString().split("T")[0];
  return task.dueDate < today;
}

function isToday(task) {
  if (!task.dueDate) return false;
  const today = new Date().toISOString().split("T")[0];
  return task.dueDate === today;
}

const todayStr = new Date().toISOString().split("T")[0];

/* ================= MAIN ================= */
function Todo() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState("");

  const [newTask, setNewTask] = useState({
    title: "",
    duration: "",
    dueDate: "",
    quadrant: 1,
    completed: false,
  });

  const token = localStorage.getItem("token");

  /* ================= FETCH ================= */
  const fetchTasks = async () => {
    const res = await fetch(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("Fetch failed");
      return;
    }

    const data = await res.json();

    // ✅ backend already gives duration & dueDate
    setTasks(
      data.map(t => ({
        ...t,
        quadrant: Number(t.quadrant),
        duration: Number(t.duration),
      }))
    );
  };

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  useEffect(() => {
    console.log("TASKS STATE:", tasks);
  }, [tasks]);


  const saveTaskToBackend = async (task) => {
    const payload = {
      title: task.title,
      focus_time: Number(task.duration),
      due_date: task.dueDate,
      quadrant: task.quadrant,
      completed: task.completed ?? false,
    };

    const url = task.id
      ? `${API_BASE}/tasks/${task.id}`
      : `${API_BASE}/tasks`;

    const res = await fetch(url, {
      method: task.id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Session expired. Please login again.");
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.msg || "Task save failed");
    }

    return await res.json(); // backend already returns formatted task
  };

  const toggleDoneBackend = async (task) => {
    const nowCompleted = !task.completed;

    //  Update task completed state
    const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ completed: nowCompleted }),
    });

    if (!res.ok) {
      console.error("Task toggle failed");
      return;
    }

    // If completed → add focus session
    if (nowCompleted) {
      await fetch(`${API_BASE}/focus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ minutes: task.duration }),
      });
    }

    fetchTasks();

    // notify dashboard to reload chart
    window.dispatchEvent(new Event("tasks-updated"));
  };


  const onDragStart = (e, task) => {
    e.dataTransfer.setData("taskId", task.id);
  };

  const onDrop = async (e, quadrant) => {
    const taskId = e.dataTransfer.getData("taskId");

    // optimistic UI
    setTasks(prev =>
      prev.map(t =>
        t.id == taskId ? { ...t, quadrant } : t
      )
    );

    // backend sync
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quadrant }),
    });
  };

  /* ================= FILTER ================= */

  const visibleTasks = tasks
    .filter(t => !t.completed)
    .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    .filter(t => {
      if (filter === "today") return isToday(t);
      if (filter === "overdue") return isOverdue(t);
      return true;
    });

  const validateTask = (task) => {
    if (!task.title.trim()) return "Task name is required";
    if (!task.duration || task.duration <= 0) return "Focus minutes required";
    if (!task.dueDate) return "Due date required";
    if (task.dueDate < todayStr) return "Date cannot be past";
    return "";
  };

  const deleteTask = async (id) => {
    const taskToArchive = tasks.find(t => t.id === id);

    if (taskToArchive) {
      const stored = JSON.parse(localStorage.getItem("tasks")) || [];
      localStorage.setItem(
        "tasks",
        JSON.stringify([...stored, { ...taskToArchive, deleted: true }])
      );
    }
    try {
      await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };


  return (
    <div className="habits-card">
      {/* TOP */}
      <div className="habits-top">
        <div>
          <h2 className="habits-title">To Do List</h2>
          <p className="habits-date">{new Date().toDateString()}</p>
        </div>

        <div className="habits-controls">
          <div className="search-input">
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {["all", "today", "overdue"].map((f) => (
              <button
                key={f}
                className={`btn ${filter === f ? "" : "ghost"}`}
                style={{ padding: "8px 12px", fontSize: "12px" }}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <span
            className="new-btn"
            onClick={() => {
              setEditingTask(null);
              setError("");
              setShowModal(true);
            }}
          >
            + New
          </span>
        </div>
      </div>

      {/* Keeping matrix grid but removing the specific page class wrapper if needed, 
          but keeping the grid itself intact */}
      <div className="matrix-grid">
        {[1, 2, 3, 4].map(q => (
          <div
            key={q}
            className="matrix-box"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, q)}
          >            <h2>
              {q === 1 && "Urgent & Important"}
              {q === 2 && "Not Urgent & Important"}
              {q === 3 && "Urgent & Not Important"}
              {q === 4 && "Not Urgent & Not Important"}
            </h2>

            <ul className="matrix-list">
              {visibleTasks.filter(t => t.quadrant === q).map(task => (
                <li
                  className={`matrix-task ${isOverdue(task) ? "overdue" : ""}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, task)}
                >

                  <div className="matrix-task-row">
                    <div className="task-left">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleDoneBackend(task)}
                      />

                      <span className="task-name">{task.title}</span>
                    </div>

                    <div className="task-actions">
                      <span
                        className="task-action edit"
                        onClick={() => {
                          setEditingTask(task);
                          setShowModal(true);
                        }}
                      >
                        Edit
                      </span>
                      <span
                        className="task-action delete"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </span>
                    </div>
                  </div>

                  <div className="task-meta">
                    <span className={`due-date ${isOverdue(task) ? "overdue" : ""}`}>
                      📅 {formatDate(task.dueDate)}
                    </span>
                    <span className="duration">⏳ {task.duration} min</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTask ? "Edit Task" : "New Task"}</h2>

            <input
              type="text"
              placeholder="Task name"
              value={editingTask ? editingTask.title : newTask.title}
              onChange={(e) =>
                editingTask
                  ? setEditingTask({ ...editingTask, title: e.target.value })
                  : setNewTask({ ...newTask, title: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Focus minutes"
              value={editingTask ? editingTask.duration : newTask.duration}
              onChange={(e) =>
                editingTask
                  ? setEditingTask({ ...editingTask, duration: e.target.value })
                  : setNewTask({ ...newTask, duration: e.target.value })
              }
            />

            <input
              type="date"
              value={editingTask ? editingTask.dueDate : newTask.dueDate}
              onChange={(e) =>
                editingTask
                  ? setEditingTask({ ...editingTask, dueDate: e.target.value })
                  : setNewTask({ ...newTask, dueDate: e.target.value })
              }
            />

            <select
              value={editingTask ? editingTask.quadrant : newTask.quadrant}
              onChange={(e) =>
                editingTask
                  ? setEditingTask({ ...editingTask, quadrant: Number(e.target.value) })
                  : setNewTask({ ...newTask, quadrant: Number(e.target.value) })
              }
            >
              <option value={1}>Urgent & Important</option>
              <option value={2}>Not Urgent & Important</option>
              <option value={3}>Urgent & Not Important</option>
              <option value={4}>Not Urgent & Not Important</option>
            </select>

            {error && <p style={{ color: "#ff5252" }}>{error}</p>}


            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button
                className="save-btn"
                onClick={async () => {
                  const task = editingTask || newTask;

                  const err = validateTask(task);
                  if (err) {
                    setError(err);
                    return;
                  }
                  if (!token) {
                    setError("Session expired. Please login again.");
                    return;
                  }

                  try {
                    const savedTask = await saveTaskToBackend(task);
                    await fetchTasks(); // force sync

                    // 🔥 THIS LINE MAKES TASK APPEAR
                    setTasks(prev =>
                      editingTask
                        ? prev.map(t => (t.id === savedTask.id ? savedTask : t))
                        : [...prev, savedTask]
                    );

                  } catch (e) {
                    console.error(e);
                    setError("Failed to save task");
                    return;
                  }

                  setShowModal(false);
                  setEditingTask(null);
                  setNewTask({
                    title: "",
                    duration: "",
                    dueDate: "",
                    quadrant: 1,
                    completed: false,
                  });
                  setError("");
                }}

              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Todo;
