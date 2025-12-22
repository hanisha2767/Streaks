import { useEffect, useState } from "react";
import {
  getReminders,
  addReminder,
  completeReminder,
  deleteReminder,
  updateReminder
} from "../api";

function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: "",
    reminder_date: "",
    reminder_time: "",
  });
  const [editingId, setEditingId] = useState(null);

  /* LOAD REMINDERS FROM BACKEND */
  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    try {
      const data = await getReminders();
      setReminders(data);
    } catch (err) {
      console.error("Load reminders error:", err.message);
    }
  }

  /* CHECK OVERDUE */
  const isOverdue = (r) => {
    if (!r.reminder_date) return false;
    const now = new Date();
    const time = r.reminder_time || "00:00";
    const reminderTime = new Date(`${r.reminder_date}T${time}`);
    return reminderTime < now && !r.completed;
  };

  /* ADD REMINDER */
  async function handleSaveReminder() {
    if (!newReminder.title || !newReminder.reminder_date) return;

    try {
      if (editingId) {
        await updateReminder(editingId, newReminder);
      } else {
         await addReminder(newReminder);
      }

      setNewReminder({
        title: "",
        reminder_date: "",
        reminder_time: "",
      });
      setEditingId(null);
      setShowModal(false);
      loadReminders();
    } catch (err) {
       console.error("Save reminder error:", err.message);
    }
  }


  /* COMPLETE REMINDER */
  async function handleComplete(id) {
    try {
      await completeReminder(id);
      loadReminders();
    } catch (err) {
      console.error("Complete reminder error:", err.message);
    }
  }

  async function handleDelete(id) {
    const confirm = window.confirm("Delete this reminder?");
    if (!confirm) return;

    try {
      await deleteReminder(id);
      loadReminders();
    } catch (err) {
       console.error("Delete reminder error:", err.message);
      }
  }


  return (
    <div className="reminders-page">
      <div className="reminders-header">
        <h1>Reminders</h1>
        <button
          className="matrix-add-btn"
          onClick={() => setShowModal(true)}
        >
          + New Reminder
        </button>
      </div>

      <ul className="reminder-list">
        {reminders.length === 0 && <p>No reminders</p>}

        {reminders.map((r) => (
          <li
            key={r.id}
            className={`reminder-item ${isOverdue(r) ? "overdue" : ""} ${
              r.completed ? "done" : ""
            }`}
          >
            <div className="reminder-left">
              <input
                type="checkbox"
                checked={r.completed}
                onChange={() => handleComplete(r.id)}
              />

              <div>
                <p className="reminder-title">{r.title}</p>
                <span className="reminder-meta">
                  📅 {r.reminder_date}
                  {r.reminder_time && ` ⏰ ${r.reminder_time}`}
                </span>
              </div>
            </div>

            <span
             className="delete"
             onClick={() => handleDelete(r.id)}
              >
             Delete
            </span>

            <span
             className="edit"
             onClick={() => {
                setEditingId(r.id);
                setNewReminder({
                 title: r.title,
                 reminder_date: r.reminder_date,
                 reminder_time: r.reminder_time || "",
                });
                setShowModal(true);
              }}
             >
             Edit
            </span>

          </li>
        ))}
      </ul>

      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit Reminder" : "New Reminder"}</h2>

            <div className="form-row">
              <label>Title</label>
              <input
                type="text"
                value={newReminder.title}
                onChange={(e) =>
                  setNewReminder({
                    ...newReminder,
                    title: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-row">
              <label>Date</label>
              <input
                type="date"
                value={newReminder.reminder_date}
                onChange={(e) =>
                  setNewReminder({
                    ...newReminder,
                    reminder_date: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-row">
              <label>Time</label>
              <input
                type="time"
                value={newReminder.reminder_time}
                onChange={(e) =>
                  setNewReminder({
                    ...newReminder,
                    reminder_time: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                className="save-btn"
                onClick={handleSaveReminder}
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

export default Reminders;
