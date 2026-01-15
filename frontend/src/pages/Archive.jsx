// Archive.jsx
import { useEffect, useState, useCallback } from "react";
import { API_BASE } from "../config";

function Archive() {
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  /* CACHE SAVE */
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('archive_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('archive_reminders', JSON.stringify(reminders));
  }, [reminders]);

  const loadArchive = useCallback(async () => {
    // Load local tasks
    const localTasksStr = localStorage.getItem("tasks");
    let localTasks = localTasksStr ? JSON.parse(localTasksStr) : [];
    setTasks(localTasks);

    const token = localStorage.getItem("token");

    if (!token) {
      setHabits([]);
      setReminders([]);
      return;
    }

    try {
      const [tRes, hRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/tasks?all=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/habits?all=true`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/reminders?all=true`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!tRes.ok || !hRes.ok || !rRes.ok) {
        throw new Error("Failed to fetch archive");
      }

      const tData = await tRes.json();
      const hData = await hRes.json();
      const rData = await rRes.json();

      // Merge tasks preferring local
      const backendTasks = Array.isArray(tData) ? tData : [];
      const localMap = new Map(localTasks.map(t => [t.id, t]));
      const backendMap = new Map(backendTasks.map(t => [t.id, t]));

      const mergedTasks = [];
      for (let id of new Set([...localMap.keys(), ...backendMap.keys()])) {
        if (localMap.has(id)) {
          mergedTasks.push(localMap.get(id));
        } else if (backendMap.has(id)) {
          mergedTasks.push(backendMap.get(id));
        }
      }

      setTasks(mergedTasks);
      localStorage.setItem("tasks", JSON.stringify(mergedTasks));

      setHabits(Array.isArray(hData) ? hData : []);
      setReminders(Array.isArray(rData) ? rData : []);
    } catch (err) {
      console.error("Failed to fetch archive", err);
    }
  }, []);

  /* LOAD */
  useEffect(() => {
    let hasCache = false;
    const cachedTasks = localStorage.getItem('tasks');
    const cachedHabits = localStorage.getItem('archive_habits');
    const cachedReminders = localStorage.getItem('archive_reminders');

    if (cachedTasks && cachedHabits && cachedReminders) {
      try {
        setTasks(JSON.parse(cachedTasks));
        setHabits(JSON.parse(cachedHabits));
        setReminders(JSON.parse(cachedReminders));
        hasCache = true;
      } catch (err) {
        console.error('Failed to parse cached archive', err);
      }
    }

    if (hasCache) {
      // background sync without loading indicator
      loadArchive();
      setLoading(false);
    } else {
      // foreground with loading
      setLoading(true);
      loadArchive().finally(() => setLoading(false));
    }
  }, [loadArchive]);

  useEffect(() => {
    const handleUpdate = () => {
      loadArchive();
    };
    window.addEventListener("tasks-updated", handleUpdate);
    window.addEventListener("habits-updated", handleUpdate);
    window.addEventListener("reminders-updated", handleUpdate);
    return () => {
      window.removeEventListener("tasks-updated", handleUpdate);
      window.removeEventListener("habits-updated", handleUpdate);
      window.removeEventListener("reminders-updated", handleUpdate);
    };
  }, [loadArchive]);

  /* OPTIMISTIC RESTORE */
  const handleRestore = async (type, id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const prevTasks = [...tasks];
    const prevHabits = [...habits];
    const prevReminders = [...reminders];

    if (type === "task") {
      setTasks(tasks.map((t) => (t.id === id ? { ...t, archived: false } : t)));
    } else if (type === "habit") {
      setHabits(habits.map((h) => (h.id === id ? { ...h, completed: true } : h)));
    } else if (type === "reminder") {
      setReminders(reminders.map((r) => (r.id === id ? { ...r, completed: false } : r)));
    }

    try {
      let url = "";
      let body = {};

      if (type === "task") {
        url = `${API_BASE}/tasks/${id}`;
        body = { archived: false };
      } else if (type === "habit") {
        url = `${API_BASE}/habits/${id}`;
        body = { completed: true };
      } else if (type === "reminder") {
        url = `${API_BASE}/reminders/${id}`;
        body = { completed: false };
      }

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to restore");
      }

      if (type === "task") {
        window.dispatchEvent(new Event("tasks-updated"));
      } else if (type === "habit") {
        window.dispatchEvent(new Event("habits-updated"));
      } else if (type === "reminder") {
        window.dispatchEvent(new Event("reminders-updated"));
      }
    } catch (err) {
      console.error("Restore failed", err);
      setTasks(prevTasks);
      setHabits(prevHabits);
      setReminders(prevReminders);
    }
  };

  /* OPTIMISTIC UNDO TASK */
  const handleUndoTask = async (task) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const prevTasks = [...tasks];

    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: false } : t)));

    try {
      const res1 = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: false }),
      });

      if (!res1.ok) {
        throw new Error("Failed to undo task");
      }

      const res2 = await fetch(`${API_BASE}/focus/decrement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ minutes: task.duration }),
      });

      if (!res2.ok) {
        throw new Error("Failed to decrement focus");
      }

      window.dispatchEvent(new Event("tasks-updated"));
      window.dispatchEvent(new Event("focusUpdated"));
    } catch (err) {
      console.error("Undo failed", err);
      setTasks(prevTasks);
    }
  };

  const completedTasks = tasks.filter((t) => t.completed && !t.archived);
  const deletedTasks = tasks.filter((t) => t.archived);
  const deletedHabits = habits.filter((h) => h.completed === false);
  const deletedReminders = reminders.filter((r) => r.completed === true);

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
          {completedTasks.length === 0 ? (
            <p className="no-data">No completed tasks</p>
          ) : (
            <div className="archive-list">
              {completedTasks.map((task) => (
                <div key={task.id} className="archive-item">
                  <div className="archive-info">
                    <h3>{task.title}</h3>
                    <p>⏱ {task.duration} min</p>
                  </div>
                  <button className="btn-undo" onClick={() => handleUndoTask(task)}>
                    Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELETED TASKS */}
        <div className="archive-section">
          <h2>Deleted Tasks</h2>
          {deletedTasks.length === 0 ? (
            <p className="no-data">No deleted tasks</p>
          ) : (
            <div className="archive-list">
              {deletedTasks.map((task) => (
                <div key={task.id} className="archive-item">
                  <div className="archive-info">
                    <h3>{task.title}</h3>
                    <p>⏱ {task.duration} min</p>
                  </div>
                  <button className="btn-restore" onClick={() => handleRestore("task", task.id)}>
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELETED HABITS */}
        <div className="archive-section">
          <h2>Deleted Habits</h2>
          {deletedHabits.length === 0 ? (
            <p className="no-data">No deleted habits</p>
          ) : (
            <div className="archive-list">
              {deletedHabits.map((habit) => (
                <div key={habit.id} className="archive-item">
                  <div className="archive-info">
                    <h3>{habit.name}</h3>
                  </div>
                  <button className="btn-restore" onClick={() => handleRestore("habit", habit.id)}>
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELETED REMINDERS */}
        <div className="archive-section">
          <h2>Deleted Reminders</h2>
          {deletedReminders.length === 0 ? (
            <p className="no-data">No deleted reminders</p>
          ) : (
            <div className="archive-list">
              {deletedReminders.map((rem) => (
                <div key={rem.id} className="archive-item">
                  <div className="archive-info">
                    <h3>{rem.title}</h3>
                    <p>
                      {rem.date} • {rem.time}
                    </p>
                  </div>
                  <button className="btn-restore" onClick={() => handleRestore("reminder", rem.id)}>
                    Restore
                  </button>
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
