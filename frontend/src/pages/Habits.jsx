import { useEffect, useState } from "react";
import { API_BASE } from "../config";

function calculateStreak(completedDates) {
  if (!completedDates || completedDates.length === 0) return 0;

  // Ensure unique dates to prevent any potential duplicates
  const uniqueDates = [...new Set(completedDates)];

  const sorted = uniqueDates.slice().sort((a, b) => b.localeCompare(a)); // descending lexical sort for YYYY-MM-DD

  // Parse date string to Date object
  const parseDate = (dateStr) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    return new Date(year, month, day, 0, 0, 0, 0);
  };

  const latestDate = parseDate(sorted[0]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (latestDate.getTime() < yesterday.getTime()) {
    // Skipped at least yesterday, streak resets to 0
    return 0;
  }

  // Count the chain from the latest date backwards
  let streak = 1;
  let current = latestDate;

  for (let i = 1; i < sorted.length; i++) {
    const expected = new Date(current);
    expected.setDate(expected.getDate() - 1);

    const nextDate = parseDate(sorted[i]);

    if (nextDate.getTime() === expected.getTime()) {
      streak++;
      current = expected;
    } else {
      break;
    }
  }

  return streak;
}

function Habits() {
  const [habits, setHabits] = useState([]);
  const [search, setSearch] = useState("");
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [removingHabitId, setRemovingHabitId] = useState(null);

  const d = new Date();
  const today = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  /* CACHE LOAD ON MOUNT */
  useEffect(() => {
    const cached = localStorage.getItem('habits');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setHabits(parsed);
        }
      } catch (err) {
        console.error('Failed to load cached habits', err);
      }
    }
    fetchHabits();
  }, []);

  /* AUTO-SAVE TO LOCALSTORAGE WHENEVER HABITS CHANGE */
  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits));
  }, [habits]);

  /* LOAD FROM SERVER */
  const fetchHabits = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/habits`, {
        headers: { Authorization: "Bearer " + token },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch habits");
      }

      const data = await res.json();
      if (Array.isArray(data)) setHabits(data);
    } catch (err) {
      console.error("Failed to fetch habits", err);
    }
  };

  /* OPTIMISTIC TOGGLE */
  const toggleHabit = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const prevHabits = habits;

    const updatedHabits = habits.map((h) => {
      if (h.id !== id) return h;

      const doneToday = h.completedDates?.includes(today);

      return {
        ...h,
        completedDates: doneToday
          ? h.completedDates.filter((d) => d !== today)
          : [...(h.completedDates || []), today],
      };
    });

    setHabits(updatedHabits);

    try {
      const res = await fetch(`${API_BASE}/habits/${id}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ date: today }),
      });

      if (!res.ok) throw new Error("Failed to toggle");
    } catch (err) {
      console.error("Toggle failed", err);
      setHabits(prevHabits);
    }
  };

  /* OPTIMISTIC SAVE (ADD / EDIT) */
  const handleSaveHabit = async () => {
    if (!newHabitName.trim()) {
      setShowHabitModal(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login again");
      return;
    }

    try {
      if (editingHabitId) {
        const updatedHabits = habits.map((h) =>
          h.id === editingHabitId ? { ...h, name: newHabitName.trim() } : h
        );
        setHabits(updatedHabits);

        const res = await fetch(`${API_BASE}/habits/${editingHabitId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ name: newHabitName.trim() }),
        });

        if (!res.ok) throw new Error("Failed to update");
      } else {
        const tempHabit = {
          id: "temp-" + Date.now(),
          name: newHabitName.trim(),
          completedDates: [],
        };

        setHabits([...habits, tempHabit]);

        const res = await fetch(`${API_BASE}/habits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ name: newHabitName.trim() }),
        });

        if (!res.ok) throw new Error("Failed to add habit");

        const savedHabit = await res.json();

        setHabits((prev) =>
          prev.map((h) => (h.id === tempHabit.id ? savedHabit : h))
        );
      }

      setNewHabitName("");
      setEditingHabitId(null);
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save habit");
      fetchHabits();
    } finally {
      setShowHabitModal(false);
    }
  };

  /* OPTIMISTIC RESET TODAY */
  const resetToday = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const prevHabits = [...habits];

    const updatedHabits = habits.map((h) => ({
      ...h,
      completedDates: h.completedDates?.filter((d) => d !== today) || [],
    }));

    setHabits(updatedHabits);

    try {
      const res = await fetch(`${API_BASE}/habits/reset-today`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ date: today }),
      });

      if (!res.ok) throw new Error("Reset failed");
    } catch (err) {
      console.error("Reset failed", err);
      setHabits(prevHabits);
    }
  };

  /* DELETE */
  const deleteHabit = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setRemovingHabitId(id);

    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/habits/${id}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token },
        });

        if (!res.ok) throw new Error("Delete failed");

        setHabits((prev) => prev.filter((h) => h.id !== id));
      } catch (err) {
        console.error("Delete failed", err);
        fetchHabits();
      } finally {
        setRemovingHabitId(null);
      }
    }, 250);
  };

  const filteredHabits = habits.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const undoneHabits = filteredHabits.filter(
    (h) => !h.completedDates?.includes(today)
  );

  const doneHabits = filteredHabits.filter((h) =>
    h.completedDates?.includes(today)
  );

  const orderedHabits = [...undoneHabits, ...doneHabits];

  const openNewHabitModal = () => {
    setNewHabitName("");
    setEditingHabitId(null);
    setShowHabitModal(true);
  };

  const closeHabitModal = () => {
    setNewHabitName("");
    setEditingHabitId(null);
    setShowHabitModal(false);
  };

  return (
    <>
      <div className="habits-card">
        <div className="habits-top">
          <div>
            <h2 className="habits-title">Habits</h2>
            <p className="habits-date">{new Date().toDateString()}</p>
          </div>

          <div className="habits-controls">
            <div className="search-input">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <span className="new-btn" onClick={openNewHabitModal}>
              + New
            </span>
          </div>
        </div>

        <ul className="habit-list">
          {orderedHabits.map((h) => {
            const doneToday = h.completedDates?.includes(today);

            return (
              <li
                key={h.id}
                className={`habit-item ${
                  removingHabitId === h.id ? "fade-out" : "fade-in"
                }`}
              >
                <div className="habit-left">
                  <div
                    className={`checkbox ${doneToday ? "checked" : ""}`}
                    onClick={() => toggleHabit(h.id)}
                  />
                  <span className={`habit-text ${doneToday ? "done" : ""}`}>
                    {h.name}
                  </span>
                </div>

                <div className="habit-right">
                  <span className="streak"> {calculateStreak(h.completedDates)}</span>
                  <span
                    className="edit"
                    onClick={() => {
                      setEditingHabitId(h.id);
                      setNewHabitName(h.name);
                      setShowHabitModal(true);
                    }}
                  >
                    Edit
                  </span>
                  <span className="delete" onClick={() => deleteHabit(h.id)}>
                    Delete
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="habits-footer">
          <span className="add-habit-btn" onClick={openNewHabitModal}>
            Add habit
          </span>
          <span className="reset-btn" onClick={resetToday}>
            Reset today
          </span>
        </div>
      </div>

      {showHabitModal && (
        <div className="modal-overlay" onClick={closeHabitModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingHabitId ? "Edit Habit" : "Add Habit"}</h2>

            <div className="form-row">
              <label>Habit Name</label>
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn ghost" onClick={closeHabitModal}>
                Cancel
              </button>
              <button className="btn" onClick={handleSaveHabit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Habits;
