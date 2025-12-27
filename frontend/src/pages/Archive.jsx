import { useState } from "react";

/* 🔥 SAME helper used in Todo.jsx */
function removeFocusMinutes(minutes) {
  const today = new Date().toISOString().split("T")[0];
  const focusData = JSON.parse(localStorage.getItem("focusHours")) || {};

  focusData[today] = Math.max(
    0,
    (focusData[today] || 0) - Number(minutes)
  );

  localStorage.setItem("focusHours", JSON.stringify(focusData));
}

function Archive() {
  const [, setRefresh] = useState(0);
  const [removingId, setRemovingId] = useState(null);

  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const habits = JSON.parse(localStorage.getItem("habits")) || [];
  const reminders = JSON.parse(localStorage.getItem("reminders")) || [];

  const saveTasks = (data) => {
    localStorage.setItem("tasks", JSON.stringify(data));
    window.dispatchEvent(new Event("tasks-updated"));
    setRefresh(r => r + 1);
  };

  const saveHabits = (data) => {
    localStorage.setItem("habits", JSON.stringify(data));
    setRefresh(r => r + 1);
  };

  const saveReminders = (data) => {
    localStorage.setItem("reminders", JSON.stringify(data));
    setRefresh(r => r + 1);
  };

  const completedTasks = tasks.filter(t => t.completed && !t.deleted);
  const deletedTasks = tasks.filter(t => t.deleted);
  const deletedHabits = habits.filter(h => h.deleted);
  const deletedReminders = reminders.filter(r => r.deleted);

  return (
    <div className="archive-page">
      <h1 className="todo-title">Archive</h1>

      {/* ===== COMPLETED TASKS ===== */}
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

          <button
            className="archive-btn restore-btn"
            onClick={() => {
              setRemovingId(task.id);

              setTimeout(() => {
                // 🔥 REMOVE focus minutes
                removeFocusMinutes(task.duration);

                saveTasks(
                  tasks.map(t =>
                    t.id === task.id
                      ? { ...t, completed: false }
                      : t
                  )
                );

                setRemovingId(null);
              }, 250);
            }}
          >
            Undo
          </button>
        </div>
      ))}

      {/* ===== DELETED TASKS ===== */}
      <h2>Deleted Tasks</h2>
      {deletedTasks.length === 0 && <p>No deleted tasks</p>}

      {deletedTasks.map(task => (
        <div key={task.id} className="archive-item">
          <div className="archive-info">
            <h3>{task.title}</h3>
          </div>

          <button
            className="archive-btn restore-btn"
            onClick={() =>
              saveTasks(
                tasks.map(t =>
                  t.id === task.id
                    ? { ...t, deleted: false, completed: false }
                    : t
                )
              )
            }
          >
            Restore
          </button>
        </div>
      ))}

      {/* ===== DELETED HABITS ===== */}
      <h2>Deleted Habits</h2>
      {deletedHabits.length === 0 && <p>No deleted habits</p>}

      {deletedHabits.map(habit => (
        <div key={habit.id} className="archive-item">
          <div className="archive-info">
            <h3>{habit.name}</h3>
          </div>

          <button
            className="archive-btn restore-btn"
            onClick={() =>
              saveHabits(
                habits.map(h =>
                  h.id === habit.id ? { ...h, deleted: false } : h
                )
              )
            }
          >
            Restore
          </button>
        </div>
      ))}

      {/* ===== DELETED REMINDERS ===== */}
      <h2>Deleted Reminders</h2>
      {deletedReminders.length === 0 && <p>No deleted reminders</p>}

      {deletedReminders.map(rem => (
        <div key={rem.id} className="archive-item">
          <div className="archive-info">
            <h3>{rem.title}</h3>
            <p>{rem.date} • {rem.time}</p>
          </div>

          <button
            className="archive-btn restore-btn"
            onClick={() =>
              saveReminders(
                reminders.map(r =>
                  r.id === rem.id ? { ...r, deleted: false } : r
                )
              )
            }
          >
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}

export default Archive;
