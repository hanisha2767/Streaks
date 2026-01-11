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
  const token = localStorage.getItem("token");

  const [completedTasks, setCompletedTasks] = useState([]);
  const [delTasks, setDelTasks] = useState([]);
  const [delHabits, setDelHabits] = useState([]);
  const [delReminders, setDelReminders] = useState([]);

  useEffect(() => {
    // BACKEND: Completed Tasks
    if (token) {
      fetch(`${API_BASE}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setCompletedTasks(data.filter((t) => t.completed));
        })
        .catch(console.error);
    }

    // LOCALSTORAGE: Deleted Items
    const lsHabits = JSON.parse(localStorage.getItem("habits") || "[]");
    setDelHabits(lsHabits.filter((h) => h.deleted));

    const lsTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    setDelTasks(lsTasks.filter((t) => t.deleted));

    const lsReminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    setDelReminders(lsReminders.filter((r) => r.deleted));
  }, []);


  return (
    <div className="habits-card">
      {/* TOP */}
      <div className="habits-top">
        <div>
          <h2 className="habits-title">Archive</h2>
          <p className="habits-date">{new Date().toDateString()}</p>
        </div>
      </div>

      <div className="archive-list" style={{ marginTop: "20px" }}>

        {/* ================= COMPLETED TASKS ================= */}
        {/* ================= COMPLETED TASKS ================= */}
        <h2>Completed Tasks</h2>
        {completedTasks.length === 0 && <p>No completed tasks</p>}

        {completedTasks.map(task => (
          <div
            key={task.id}
            className="archive-item"
          >
            <div className="archive-info">
              <h3>{task.title}</h3>
              <p>⏱ {task.duration} min</p>
            </div>
          </div>
        ))}

        {/* ================= DELETED TASKS ================= */}
        <h2>Deleted Tasks</h2>
        {delTasks.length === 0 && <p>No deleted tasks</p>}

        {delTasks.map(task => (
          <div key={task.id} className="archive-item">
            <div className="archive-info">
              <h3>{task.title}</h3>
            </div>
          </div>
        ))}

        {/* ================= DELETED HABITS ================= */}
        <h2>Deleted Habits</h2>
        {delHabits.length === 0 && <p>No deleted habits</p>}

        {delHabits.map(habit => (
          <div key={habit.id} className="archive-item">
            <div className="archive-info">
              <h3>{habit.name}</h3>
            </div>
          </div>
        ))}

        {/* ================= DELETED REMINDERS ================= */}
        <h2>Deleted Reminders</h2>
        {delReminders.length === 0 && <p>No deleted reminders</p>}

        {delReminders.map(rem => (
          <div key={rem.id} className="archive-item">
            <div className="archive-info">
              <h3>{rem.title}</h3>
              <p>{rem.date} • {rem.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Archive;
