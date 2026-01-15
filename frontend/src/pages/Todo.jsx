import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

/* ================= HELPERS ================= */
function addFocusMinutes(minutes) {
  const today = new Date().toISOString().split("T")[0];
  const data = JSON.parse(localStorage.getItem("focusHours")) || {};
  data[today] = (data[today] || 0) + Number(minutes);
  localStorage.setItem("focusHours", JSON.stringify(data));
}

function removeFocusMinutes(minutes) {
  const today = new Date().toISOString().split("T")[0];
  const data = JSON.parse(localStorage.getItem("focusHours")) || {};
  data[today] = Math.max(0, (data[today] || 0) - Number(minutes));
  localStorage.setItem("focusHours", JSON.stringify(data));
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
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

/* ================= AUTH HELPER ================= */

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

async function postFocusMinutes(minutes) {
  const headers = getAuthHeaders();
  if (!headers) return false;

  const res = await fetch(`${API_BASE}/focus`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ minutes: Number(minutes) }),
  });
  return res.ok;
}

async function decrementFocusMinutes(minutes) {
  const headers = getAuthHeaders();
  if (!headers) return false;

  const res = await fetch(`${API_BASE}/focus/decrement`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ minutes: Number(minutes) }),
  });
  return res.ok;
}

/* ================= NORMALIZE TASK ================= */
function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    duration: task.focus_time ?? task.duration ?? "",
    dueDate: task.due_date ?? task.dueDate ?? "",
    quadrant: Number(task.quadrant) || 1,
    completed: !!task.completed,
    removing: !!task.removing,
    archived: !!task.archived,
  };
}

/* ================= MAIN ================= */

function Todo() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const blockRefetchRef = useRef(false); // Block refetches during fade-out period

  const [newTask, setNewTask] = useState({
    title: "",
    duration: "",
    dueDate: "",
    quadrant: 1,
    completed: false,
  });

  /* ================= FETCH TASKS ================= */
  const fetchTasks = async (useCache = true) => {
    const headers = getAuthHeaders();
    if (!headers) {
      navigate("/login");
      return;
    }

    try {
      // Load from cache first for instant render (only if useCache is true)
      if (useCache) {
        const cached = localStorage.getItem("tasks");
        if (cached) {
          try {
            const cachedTasks = JSON.parse(cached).map(normalizeTask);
            // Filter out archived AND completed tasks from cache
            const activeTasks = cachedTasks.filter(
              (t) => !t.archived && !t.completed
            );
            if (activeTasks.length > 0) {
              console.log(
                "Loaded from cache:",
                activeTasks.length,
                "active tasks (filtered from",
                cachedTasks.length,
                "total)"
              );
              setTasks(activeTasks);
              setLoading(false);
            } else {
              console.log(
                "Cache contains only archived/completed tasks, waiting for backend fetch"
              );
            }
          } catch (e) {
            console.error("Failed to parse cached tasks:", e);
          }
        }
      }

      // Always fetch from backend to ensure fresh data
      console.log("Fetching tasks from backend...");
      const res = await fetch(`${API_BASE}/tasks`, { headers });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to fetch tasks:", res.status, errorText);
        throw new Error("Failed to fetch tasks");
      }

      const data = await res.json();
      console.log("Fetched from backend:", data.length, "tasks", data);

      // Normalize tasks
      const normalizedTasks = data.map(normalizeTask);

      // CRITICAL: Filter out completed tasks immediately - they should NEVER appear
      const activeBackendTasks = normalizedTasks.filter(
        (t) => !t.completed && !t.archived
      );

      console.log(
        "Fetched from backend:",
        normalizedTasks.length,
        "total,",
        activeBackendTasks.length,
        "active (non-completed)"
      );

      // Preserve tasks that are currently in "removing" state (fading out)
      // Don't overwrite them with backend data - they're being removed
      setTasks((prev) => {
        const removingTasks = prev.filter((t) => t.removing);

        // Start with active backend tasks (NO completed tasks)
        const mergedTasks = [...activeBackendTasks];

        // Add back removing tasks (they're fading out, don't replace them)
        removingTasks.forEach((removingTask) => {
          const exists = mergedTasks.some(
            (t) => String(t.id) === String(removingTask.id)
          );
          if (!exists) {
            mergedTasks.push(removingTask);
          }
        });

        return mergedTasks;
      });

      // Only save active (non-completed) tasks to cache
      localStorage.setItem("tasks", JSON.stringify(activeBackendTasks));
      window.dispatchEvent(new Event("tasks-updated"));
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch fresh data when component mounts
    fetchTasks(true);

    // Listen for tasks-updated event to refresh
    const handleTasksUpdate = () => {
      // Don't refetch if we're in the middle of a fade-out period
      if (blockRefetchRef.current) return;

      // Small delay to ensure Archive has finished updating localStorage
      setTimeout(() => {
        if (!blockRefetchRef.current) {
          fetchTasks(false); // Don't use cache, fetch fresh
        }
      }, 100);
    };

    window.addEventListener("tasks-updated", handleTasksUpdate);

    // Also listen for visibility change (when tab/window becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden && !blockRefetchRef.current) {
        fetchTasks(false); // Refresh when page becomes visible (only if not blocked)
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("tasks-updated", handleTasksUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= SAVE TASKS (with backend sync) ================= */
  const saveTasks = (data, skipEvent = false, skipLocalStorage = false) => {
    setTasks(data);
    // Only update localStorage if not skipping (for completion/deletion, we skip it)
    if (!skipLocalStorage) {
      localStorage.setItem("tasks", JSON.stringify(data));
    }
    // Only dispatch event if not skipping (to prevent refetch loops during optimistic updates)
    if (!skipEvent) {
      window.dispatchEvent(new Event("tasks-updated"));
    }
  };

  /* ================= CREATE/UPDATE TASK ================= */
  const saveTaskToBackend = async (task) => {
    const headers = getAuthHeaders();
    if (!headers) {
      navigate("/login");
      return false;
    }

    try {
      const payload = {
        title: task.title,
        focus_time: Number(task.duration),
        due_date: task.dueDate || null,
        quadrant: task.quadrant,
        completed: task.completed ?? false,
      };

      let res;
      if (task.id && typeof task.id === "number" && task.id > 1000000000000) {
        // Local-only task (timestamp ID), create new
        res = await fetch(`${API_BASE}/tasks`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (task.id) {
        // Existing task, update
        res = await fetch(`${API_BASE}/tasks/${task.id}`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // New task
        res = await fetch(`${API_BASE}/tasks`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate("/login");
        return false;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to save task:", res.status, errorData);
        throw new Error(errorData.msg || "Failed to save task");
      }

      const savedTask = await res.json();
      console.log("Task saved successfully:", savedTask);
      return normalizeTask(savedTask);
    } catch (err) {
      console.error("Failed to save task:", err);
      return false;
    }
  };

  /* ================= DELETE TASK ================= */
  const deleteTaskFromBackend = async (id) => {
    const headers = getAuthHeaders();
    if (!headers) {
      navigate("/login");
      return false;
    }

    try {
      // If it's a local-only task (timestamp ID), just remove from local
      if (typeof id === "number" && id > 1000000000000) {
        return true;
      }

      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
        headers,
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate("/login");
        return false;
      }

      return res.ok;
    } catch (err) {
      console.error("Failed to delete task:", err);
      return false;
    }
  };

  /* ===== SEARCH + FILTER ===== */
  // First, filter out archived tasks and completed tasks (unless they're in removing animation)
  const incompleteTasks = tasks.filter((t) => {
    // Never show archived tasks
    if (t.archived) return false;
    // Never show completed tasks (they should be removed, not shown)
    if (t.completed && !t.removing) return false;
    // Only show incomplete tasks OR tasks currently fading out (removing)
    return !t.completed || t.removing;
  });

  // Then apply search and date filters
  const visibleTasks = incompleteTasks
    .filter((t) => t.title && t.title.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => {
      if (filter === "today") return isToday(t);
      if (filter === "overdue") return isOverdue(t);
      return true;
    });

  /* ===== VALIDATION ===== */
  const validateTask = (task) => {
    if (!task.title.trim()) return "Task name is required";
    if (!task.duration || Number(task.duration) <= 0)
      return "Focus minutes must be greater than 0";
    if (!task.dueDate) return "Due date is required";
    if (task.dueDate < todayStr) return "Due date cannot be in the past";
    return "";
  };

  return (
    <div className="todo-page">
      <h1 className="todo-title">To Do List</h1>

      <div className="todo-actions">
        <input
          className="todo-search"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="todo-filters">
          {["all", "today", "overdue"].map((f) => (
            <button
              key={f}
              className={`todo-filter ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <button
          className="matrix-add-btn"
          onClick={() => {
            setEditingTask(null);
            setError("");
            setShowModal(true);
          }}
        >
          + New Task
        </button>
      </div>

      {loading ? (
        <div style={{ marginTop: "120px", marginLeft: "320px", color: "#fff" }}>
          Loading tasks...
        </div>
      ) : (
        <div className="matrix-grid">
          {renderBox(
            1,
            "Urgent & Important",
            tasks,
            visibleTasks,
            setTasks,
            saveTasks,
            setEditingTask,
            setShowModal,
            fetchTasks,
            saveTaskToBackend,
            deleteTaskFromBackend,
            blockRefetchRef
          )}
          {renderBox(
            2,
            "Not Urgent & Important",
            tasks,
            visibleTasks,
            setTasks,
            saveTasks,
            setEditingTask,
            setShowModal,
            fetchTasks,
            saveTaskToBackend,
            deleteTaskFromBackend,
            blockRefetchRef
          )}
          {renderBox(
            3,
            "Urgent & Not Important",
            tasks,
            visibleTasks,
            setTasks,
            saveTasks,
            setEditingTask,
            setShowModal,
            fetchTasks,
            saveTaskToBackend,
            deleteTaskFromBackend,
            blockRefetchRef
          )}
          {renderBox(
            4,
            "Not Urgent & Not Important",
            tasks,
            visibleTasks,
            setTasks,
            saveTasks,
            setEditingTask,
            setShowModal,
            fetchTasks,
            saveTaskToBackend,
            deleteTaskFromBackend,
            blockRefetchRef
          )}
        </div>
      )}

      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTask ? "Edit Task" : "New Task"}</h2>

            <div className="form-row">
              <label>Task Name *</label>
              <input
                type="text"
                value={editingTask ? editingTask.title : newTask.title}
                onChange={(e) =>
                  editingTask
                    ? setEditingTask({ ...editingTask, title: e.target.value })
                    : setNewTask({ ...newTask, title: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <label>Focus Minutes *</label>
              <input
                type="number"
                min="1"
                value={editingTask ? editingTask.duration : newTask.duration}
                onChange={(e) =>
                  editingTask
                    ? setEditingTask({ ...editingTask, duration: e.target.value })
                    : setNewTask({ ...newTask, duration: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <label>Due Date *</label>
              <input
                type="date"
                min={todayStr}
                value={editingTask ? editingTask.dueDate || "" : newTask.dueDate}
                onChange={(e) =>
                  editingTask
                    ? setEditingTask({ ...editingTask, dueDate: e.target.value })
                    : setNewTask({ ...newTask, dueDate: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <label>Quadrant</label>
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
            </div>

            {error && <p style={{ color: "#ff5252", fontSize: "14px" }}>{error}</p>}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button
                className="save-btn"
                disabled={saving}
                onClick={async () => {
                  const taskToSave = editingTask || newTask;
                  const err = validateTask(taskToSave);
                  if (err) {
                    setError(err);
                    return;
                  }

                  setError("");
                  setSaving(true);

                  try {
                    if (editingTask) {
                      // Update existing task
                      const updatedTask = { ...editingTask };
                      const saved = await saveTaskToBackend(updatedTask);

                      if (saved) {
                        // Update local state immediately
                        const newTasks = tasks.map((t) =>
                          t.id === editingTask.id ? saved : t
                        );
                        saveTasks(newTasks);

                        // Close modal
                        setShowModal(false);
                        setEditingTask(null);
                      } else {
                        setError("Failed to save task. Please check your connection and try again.");
                        setSaving(false);
                        return;
                      }
                    } else {
                      // Create new task
                      console.log("Creating new task:", newTask);
                      const saved = await saveTaskToBackend(newTask);

                      if (saved) {
                        console.log("Task created, adding to state:", saved);
                        // Add to local state immediately
                        const newTasks = [...tasks, saved];
                        saveTasks(newTasks);

                        // Reset form
                        setNewTask({
                          title: "",
                          duration: "",
                          dueDate: "",
                          quadrant: 1,
                          completed: false,
                        });

                        // Close modal
                        setShowModal(false);
                      } else {
                        setError("Failed to create task. Please check your connection and try again.");
                        setSaving(false);
                        return;
                      }
                    }
                  } catch (err) {
                    console.error("Error saving task:", err);
                    setError("An error occurred. Please try again.");
                    setSaving(false);
                    return;
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving..." : "Save"}
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
  fullTasks,
  visibleTasks,
  setTasks,
  saveTasks,
  setEditingTask,
  setShowModal,
  fetchTasks,
  saveTaskToBackend,
  deleteTaskFromBackend,
  blockRefetchRef
) {
  // Filter by quadrant - visibleTasks already has incomplete tasks filtered
  const filtered = visibleTasks.filter((t) => {
    // Ensure quadrant is a number for comparison
    const taskQuadrant = typeof t.quadrant === "number" ? t.quadrant : Number(t.quadrant);
    return taskQuadrant === q;
  });

  // Debug logging for this quadrant
  if (
    filtered.length > 0 ||
    visibleTasks.some((t) => {
      const taskQuadrant = typeof t.quadrant === "number" ? t.quadrant : Number(t.quadrant);
      return taskQuadrant === q;
    })
  ) {
    console.log(`Quadrant ${q} (${title}):`, {
      filteredCount: filtered.length,
      tasksInQuadrant: visibleTasks.filter((t) => {
        const taskQuadrant = typeof t.quadrant === "number" ? t.quadrant : Number(t.quadrant);
        return taskQuadrant === q;
      }).length,
      sampleTask:
        filtered[0] ||
        visibleTasks.find((t) => {
          const taskQuadrant = typeof t.quadrant === "number" ? t.quadrant : Number(t.quadrant);
          return taskQuadrant === q;
        }),
    });
  }

  const toggleDone = async (id) => {
    // Use current state, not fullTasks prop (which might be stale)
    setTasks((prev) => {
      const currentTask = prev.find((t) => t.id === id);
      if (!currentTask) return prev;

      const nowCompleted = !currentTask.completed;

      if (nowCompleted) {
        // IMMEDIATE: Start fade-out animation (UI only, no localStorage)
        const optimisticTask = { ...currentTask, removing: true, completed: true };

        // Block refetches for 5+ seconds
        if (blockRefetchRef && blockRefetchRef.current !== undefined) {
          blockRefetchRef.current = true;
        }

        // Update focus minutes immediately in localStorage
        addFocusMinutes(currentTask.duration);
        // Persist focus minutes in backend (fire-and-forget, don't wait)
        postFocusMinutes(currentTask.duration).catch(() => {});
        window.dispatchEvent(new Event("focusUpdated"));

        // After animation completes, sync with backend
        setTimeout(async () => {
          const updatedTask = { ...currentTask, completed: true };
          const saved = await saveTaskToBackend(updatedTask);

          if (saved) {
            // After 5 seconds, actually remove it from the list and unblock refetches
            setTimeout(() => {
              setTasks((prevTasks) => prevTasks.filter((t) => t.id !== id));
              if (blockRefetchRef && blockRefetchRef.current !== undefined) {
                blockRefetchRef.current = false; // Allow refetches again
              }
            }, 5000); // 5 seconds delay before removal
          } else {
            // Revert on error - restore original state
            setTasks((prevTasks) =>
              prevTasks.map((t) => (t.id === id ? { ...currentTask, removing: false } : t))
            );
            removeFocusMinutes(currentTask.duration);
            decrementFocusMinutes(currentTask.duration).catch(() => {});
            if (blockRefetchRef && blockRefetchRef.current !== undefined) {
              blockRefetchRef.current = false; // Unblock on error
            }
          }
        }, 250); // Faster animation - 250ms instead of 500ms

        return prev.map((t) => (t.id === id ? optimisticTask : t));
      } else {
        // Uncomplete: immediate optimistic update (UI only, no localStorage)
        removeFocusMinutes(currentTask.duration);
        decrementFocusMinutes(currentTask.duration).catch(() => {});

        const optimisticTask = { ...currentTask, completed: false, removing: false };

        // Sync with backend in background (don't update localStorage)
        setTimeout(async () => {
          const saved = await saveTaskToBackend(optimisticTask);
          if (saved) {
            setTasks((prevTasks) => prevTasks.map((t) => (t.id === id ? saved : t)));
          }
        }, 100);

        window.dispatchEvent(new Event("focusUpdated"));

        return prev.map((t) => (t.id === id ? optimisticTask : t));
      }
    });
  };

  const deleteTask = async (id) => {
    const currentTask = fullTasks.find((t) => t.id === id);
    if (!currentTask) return;

    // 1. IMMEDIATE: Start fade-out animation (UI only, no localStorage)
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );

    // Block refetches for 5+ seconds
    if (blockRefetchRef && blockRefetchRef.current !== undefined) {
      blockRefetchRef.current = true;
    }

    // 2. After animation, sync with backend and keep faded for 5 more seconds
    setTimeout(async () => {
      const success = await deleteTaskFromBackend(id);

      if (success) {
        // Keep task faded (removing: true) for 5 more seconds
        // After 5 seconds, actually remove it and unblock refetches
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
          if (blockRefetchRef && blockRefetchRef.current !== undefined) {
            blockRefetchRef.current = false; // Allow refetches again
          }
        }, 5000); // 5 seconds delay before removal
      } else {
        // Revert on error - restore task
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...currentTask, removing: false } : t))
        );
        if (blockRefetchRef && blockRefetchRef.current !== undefined) {
          blockRefetchRef.current = false; // Unblock on error
        }
      }
    }, 250); // Wait for fade animation to complete
  };

  const onDragStart = (e, task) => {
    e.dataTransfer.setData("taskId", String(task.id));
  };

  const onDrop = async (e) => {
    const taskId = e.dataTransfer.getData("taskId");
    const taskToUpdate = fullTasks.find((t) => String(t.id) === String(taskId));

    if (!taskToUpdate) return;

    const updatedTask = { ...taskToUpdate, quadrant: q };
    const saved = await saveTaskToBackend(updatedTask);

    if (saved) {
      const newTasks = fullTasks.map((t) =>
        String(t.id) === String(taskId) ? saved : t
      );
      saveTasks(newTasks, true); // Skip event to prevent refetch
      // Don't call fetchTasks() - it would refetch and might bring back completed tasks
    }
  };

  return (
    <div className="matrix-box" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <h2>{title}</h2>

      <ul className="matrix-list">
        {filtered.length === 0 && <p>No tasks</p>}

        {filtered.map((task) => (
          <li
            key={task.id}
            className={`matrix-task ${task.completed ? "done" : ""} ${task.removing ? "removing" : ""} ${isOverdue(task) ? "overdue" : ""}`}
            draggable={!task.removing}
            onDragStart={(e) => onDragStart(e, task)}
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

              <div className="task-actions">
                <span className="task-action edit" onClick={() => { setEditingTask(task); setShowModal(true); }}>
                  Edit
                </span>
                <span className="task-action delete" onClick={() => deleteTask(task.id)}>
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
  );
}

export default Todo;
