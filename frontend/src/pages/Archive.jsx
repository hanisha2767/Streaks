import { useEffect, useState } from "react";
import { API_BASE } from "../config";

function Archive() {
  const token = localStorage.getItem("token");

  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [tRes, hRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/tasks?all=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/habits?all=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/reminders?all=true`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const tData = await tRes.json();
      const hData = await hRes.json();
      const rData = await rRes.json();

      setTasks(Array.isArray(tData) ? tData : []);
      setHabits(Array.isArray(hData) ? hData : []);
      setReminders(Array.isArray(rData) ? rData : []);
    } catch (err) {
      console.error("Failed to fetch archive", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleRestore = async (type, id) => {
    let url = "";
    let body = {};

    if (type === "task") {
      url = `${API_BASE}/tasks/${id}`;
      body = { archived: false };
    } else if (type === "habit") {
      url = `${API_BASE}/habits/${id}`;
      body = { completed: true }; // for habits, completed: true means ACTIVE
    } else if (type === "reminder") {
      url = `${API_BASE}/reminders/${id}`;
      body = { completed: false }; // for reminders, completed: false means ACTIVE
    }

    try {
      await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      fetchAll();
      window.dispatchEvent(new Event("tasks-updated"));
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  const handleUndoTask = async (task) => {
    try {
      // 1. Unmark task as completed
      await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: false })
      });

      // 2. Decrement focus minutes
      await fetch(`${API_BASE}/focus/decrement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ minutes: task.duration })
      });

      fetchAll();
      window.dispatchEvent(new Event("tasks-updated"));
    } catch (err) {
      console.error("Undo failed", err);
    }
  };

  const completedTasks = tasks.filter(t => t.completed && !t.archived);
  const deletedTasks = tasks.filter(t => t.archived);
  const deletedHabits = habits.filter(h => h.completed === false);
  const deletedReminders = reminders.filter(r => r.completed === true);

  if (loading) return <div style={{ color: "#fff", padding: "100px 320px" }}>Loading Archive...</div>;

  return (
    <div className="habits-card">
      <div className="habits-top">
        <div>
          <h2 className="habits-title">Archive</h2>
          <p className="habits-date">{new Date().toDateString()}</p>
        </div>
      </div>

      <div className="archive-content">

        {/* COMPLETED TASKS */}
        <div className="archive-section">
          <h2>Completed Tasks</h2>
          {completedTasks.length === 0 ? <p className="no-data">No completed tasks</p> : (
            <div className="archive-list">
              {completedTasks.map(task => (
                <div key={task.id} className="archive-item">
                  <div className="archive-info">
                    <h3>{task.title}</h3>
                    <p>⏱ {task.duration} min</p>
                  </div>
                  <button className="btn-undo" onClick={() => handleUndoTask(task)}>Undo</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELETED TASKS */}
        <div className="archive-section">
          <h2>Deleted Tasks</h2>
          {deletedTasks.length === 0 ? <p className="no-data">No deleted tasks</p> : (
            <div className="archive-list">
              {deletedTasks.map(task => (
                <div key={task.id} className="archive-item">
                  <div className="archive-info">
                    <h3>{task.title}</h3>
                    <p>⏱ {task.duration} min</p>
                  </div>
                  <button className="btn-restore" onClick={() => handleRestore("task", task.id)}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELETED HABITS */}
        <div className="archive-section">
          <h2>Deleted Habits</h2>
          {deletedHabits.length === 0 ? <p className="no-data">No deleted habits</p> : (
            <div className="archive-list">
              {deletedHabits.map(habit => (
                <div key={habit.id} className="archive-item">
                  <div className="archive-info">
                    <h3>{habit.name}</h3>
                  </div>
                  <button className="btn-restore" onClick={() => handleRestore("habit", habit.id)}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELETED REMINDERS */}
        <div className="archive-section">
          <h2>Deleted Reminders</h2>
          {deletedReminders.length === 0 ? <p className="no-data">No deleted reminders</p> : (
            <div className="archive-list">
              {deletedReminders.map(rem => (
                <div key={rem.id} className="archive-item">
                  <div className="archive-info">
                    <h3>{rem.title}</h3>
                    <p>{rem.date} • {rem.time}</p>
                  </div>
                  <button className="btn-restore" onClick={() => handleRestore("reminder", rem.id)}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Archive;
