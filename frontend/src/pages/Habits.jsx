import { useEffect, useState } from "react";
import {
  getHabits,
  addHabit,
  completeHabit,
  updateHabit,
  deleteHabit,
  resetHabitToday,
} from "../api";

function Habits() {
  const [habits, setHabits] = useState([]);
  const [search, setSearch] = useState("");
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [editingId, setEditingId] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  /* LOAD HABITS */
  useEffect(() => {
    loadHabits();
  }, []);

  async function loadHabits() {
    try {
      const data = await getHabits();
      setHabits(data);
    } catch (err) {
      console.error("Load habits error:", err.message);
    }
  }

  /* TOGGLE TODAY COMPLETE */
  async function toggleHabit(id) {
    try {
      await completeHabit(id);
      loadHabits();
    } catch (err) {
      console.error("Toggle habit error:", err.message);
    }
  }

  /* SAVE (ADD / EDIT) */
  async function handleSaveHabit() {
    if (!habitName.trim()) return;

    try {
      if (editingId) {
        await updateHabit(editingId, { name: habitName });
      } else {
        await addHabit(habitName);
      }

      setHabitName("");
      setEditingId(null);
      setShowHabitModal(false);
      loadHabits();
    } catch (err) {
      console.error("Save habit error:", err.message);
    }
  }

  /* DELETE HABIT */
  async function handleDelete(id) {
    if (!window.confirm("Delete this habit?")) return;

    try {
      await deleteHabit(id);
      loadHabits();
    } catch (err) {
      console.error("Delete habit error:", err.message);
    }
  }

  /* RESET TODAY */
  async function resetToday() {
    if (!habits.length) return;

    if (!window.confirm("Reset today for all habits?")) return;

    try {
      await Promise.all(habits.map((h) => resetHabitToday(h.id)));
      loadHabits();
    } catch (err) {
      console.error("Reset today error:", err.message);
    }
  }

  /* FILTER */
  const filteredHabits = habits.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const undone = filteredHabits.filter(
    (h) => !h.completed_dates?.includes(today)
  );
  const done = filteredHabits.filter((h) =>
    h.completed_dates?.includes(today)
  );

  const orderedHabits = [...undone, ...done];

  return (
    <>
      {/* ================= HABITS CARD ================= */}
      <div className="habits-card">
        <div className="habits-top">
          <div>
            <h2 className="habits-title">Habits</h2>
            <p className="habits-date">{new Date().toDateString()}</p>
          </div>

          <div className="habits-controls">
            <input
              className="search-input"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <span
              className="new-btn"
              onClick={() => {
                setEditingId(null);
                setHabitName("");
                setShowHabitModal(true);
              }}
            >
              + New
            </span>

            <span className="more-btn">More</span>
          </div>
        </div>

        {/* LIST */}
        <ul className="habit-list">
          {orderedHabits.map((h) => {
            const completedToday =
              h.completed_dates?.includes(today);

            return (
              <li key={h.id} className="habit-item">
                <div className="habit-left">
                  <div
                    className={`checkbox ${
                      completedToday ? "checked" : ""
                    }`}
                    onClick={() => toggleHabit(h.id)}
                  />

                  <span
                    className={`habit-text ${
                      completedToday ? "done" : ""
                    }`}
                  >
                    {h.name}
                  </span>
                </div>

                <div className="habit-right">
                  <span className="streak">
                    🔥 {h.streak || 0}
                  </span>

                  <span
                    className="edit"
                    onClick={() => {
                      setEditingId(h.id);
                      setHabitName(h.name);
                      setShowHabitModal(true);
                    }}
                  >
                    Edit
                  </span>

                  <span
                    className="delete"
                    onClick={() => handleDelete(h.id)}
                  >
                    Delete
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* FOOTER */}
        <div className="habits-footer">
          <span
            className="add-habit-btn"
            onClick={() => {
              setEditingId(null);
              setHabitName("");
              setShowHabitModal(true);
            }}
          >
            Add habit
          </span>

          <span className="reset-btn" onClick={resetToday}>
            Reset today
          </span>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {showHabitModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowHabitModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              {editingId ? "Edit Habit" : "New Habit"}
            </h2>

            <div className="form-row">
              <label>Habit Name</label>
              <input
                type="text"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                placeholder="e.g. Read 30 mins"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn ghost"
                onClick={() => {
                  setShowHabitModal(false);
                  setEditingId(null);
                }}
              >
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
