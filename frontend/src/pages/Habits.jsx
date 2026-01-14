import { useEffect, useState } from "react";
import { API_BASE } from "../config";

function Habits() {
  const [habits, setHabits] = useState([]);
  const [search, setSearch] = useState("");
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [removingHabitId, setRemovingHabitId] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  /* LOAD */
  const fetchHabits = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/habits`, {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const data = await res.json();
      if (Array.isArray(data)) {
        setHabits(data);
      }
    } catch (err) {
      console.error("Failed to fetch habits", err);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  /* TOGGLE CHECK */
  const toggleHabit = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/habits/${id}/toggle`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const data = await res.json();

      setHabits(prev =>
        prev.map(h =>
          h.id === id ? { ...h, completedDates: data.completedDates } : h
        )
      );
    } catch (err) {
      console.error("Toggle habit failed", err);
    }
  };


  const handleSaveHabit = async () => {
    if (!newHabitName.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login again");
      return;
    }

    try {
      // 🔹 EDIT HABIT
      if (editingHabitId) {
        const res = await fetch(
          `${API_BASE}/habits/${editingHabitId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
              name: newHabitName.trim(),
            }),
          }
        );

        const updatedHabit = await res.json();

        setHabits(
          habits.map((h) =>
            h.id === editingHabitId ? updatedHabit : h
          )
        );
      }
      // 🔹 ADD HABIT
      else {
        const res = await fetch(`${API_BASE}/habits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            name: newHabitName.trim(),
          }),
        });

        const newHabit = await res.json();

        setHabits([...habits, newHabit]);
      }

      setNewHabitName("");
      setEditingHabitId(null);
      setShowHabitModal(false);
    } catch (err) {
      console.error("Habit save failed", err);
      alert("Failed to save habit");
    }
  };

  /* RESET */
  const resetToday = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await fetch(`${API_BASE}/habits/reset-today`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
        },
      });
      // then refetch, backend is source of truth
      fetchHabits();
    } catch (err) {
      console.error("Reset today failed", err);
    }
  };


  /* SOFT DELETE WITH ANIMATION */
  const deleteHabit = async (id) => {
    const habitToArchive = habits.find(h => h.id === id);

    if (habitToArchive) {
      const stored = JSON.parse(localStorage.getItem("habits")) || [];
      localStorage.setItem(
        "habits",
        JSON.stringify([...stored, { ...habitToArchive, deleted: true }])
      );
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    setRemovingHabitId(id);

    setTimeout(async () => {
      await fetch(`${API_BASE}/habits/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      setHabits(prev => prev.filter(h => h.id !== id));
      setRemovingHabitId(null);
    }, 250);
  };


  const filteredHabits = habits.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );


  const undoneHabits = filteredHabits.filter(
    (h) => !h.completedDates?.includes(today)
  );

  const doneHabits = filteredHabits.filter(
    (h) => h.completedDates?.includes(today)
  );

  const orderedHabits = [...undoneHabits, ...doneHabits];

  return (
    <>
      <div className="habits-card">
        {/* TOP */}
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

            <span className="new-btn" onClick={() => setShowHabitModal(true)}>
              + New
            </span>
          </div>
        </div>

        {/* LIST */}
        <ul className="habit-list">
          {orderedHabits.map((h) => {
            const doneToday = h.completedDates?.includes(today);

            return (
              <li
                key={h.id}
                className={`habit-item ${removingHabitId === h.id ? "fade-out" : "fade-in"
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
                  <span className="streak"> {h.streak}</span>
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

                  <span
                    className="delete"
                    onClick={() => deleteHabit(h.id)}
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
            onClick={() => setShowHabitModal(true)}
          >
            Add habit
          </span>

          <span className="reset-btn" onClick={resetToday}>
            Reset today
          </span>
        </div>
      </div>

      {/* MODAL */}
      {showHabitModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowHabitModal(false)}
        >
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
              <button
                className="btn ghost"
                onClick={() => setShowHabitModal(false)}
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
