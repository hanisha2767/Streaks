import { useEffect, useState } from "react";
import { API_BASE } from "../config";

/* same helper */
function removeFocusMinutes(minutes) {
  const today = new Date().toISOString().split("T")[0];
  const focusData = JSON.parse(localStorage.getItem("focusHours")) || {};
  focusData[today] = Math.max(0, (focusData[today] || 0) - Number(minutes));
  localStorage.setItem("focusHours", JSON.stringify(focusData));
}

function Archive() {
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [removingId, setRemovingId] = useState(null);

  const token = localStorage.getItem("token");

  /* ================= LOAD FROM BACKEND ================= */
  const loadAll = async () => {
    if (!token) return;

    const [t, h, r] = await Promise.all([
      fetch(`${API_BASE}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => res.json()),

      fetch(`${API_BASE}/habits`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => res.json()),

      fetch(`${API_BASE}/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => res.json()),
    ]);

    setTasks(t || []);
    setHabits(h || []);
    setReminders(r || []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ================= FILTERS ================= */
  // TASKS
const completedTasks = tasks.filter(t => t.completed && !t.archived);
const deletedTasks = tasks.filter(t => t.archived);

// HABITS
const deletedHabits = habits.filter(h => !h.completed);

// REMINDERS
const deletedReminders = reminders.filter(r => r.deleted);


  return (
    <div className="archive-page">
      <h1 className="todo-title">Archive</h1>

      {/* ================= COMPLETED TASKS ================= */}
      <h2>Completed Tasks</h2>
      {completedTasks.length === 0 && <p>No completed tasks</p>}

      {completedTasks.map(task => (
        <div
          key={task.id}
          className={`archive-item ${
            removingId === task.id ? "fade-out" : "fade-in"
          }`}
        >
          <div className="archive-info">
            <h3>{task.title}</h3>
            <p>⏱ {task.duration} min</p>
          </div>
        </div>
      ))}

      {/* ================= DELETED TASKS ================= */}
      <h2>Deleted Tasks</h2>
      {deletedTasks.length === 0 && <p>No deleted tasks</p>}

      {deletedTasks.map(task => (
        <div key={task.id} className="archive-item">
          <div className="archive-info">
            <h3>{task.title}</h3>
          </div>
        </div>
      ))}

      {/* ================= DELETED HABITS ================= */}
      <h2>Deleted Habits</h2>
      {deletedHabits.length === 0 && <p>No deleted habits</p>}

      {deletedHabits.map(habit => (
        <div key={habit.id} className="archive-item">
          <div className="archive-info">
            <h3>{habit.name}</h3>
          </div>
        </div>
      ))}

      {/* ================= DELETED REMINDERS ================= */}
      <h2>Deleted Reminders</h2>
      {deletedReminders.length === 0 && <p>No deleted reminders</p>}

      {deletedReminders.map(rem => (
        <div key={rem.id} className="archive-item">
          <div className="archive-info">
            <h3>{rem.title}</h3>
            <p>{rem.date} • {rem.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Archive;
