// src/utils/archive.js

const DEFAULT_ARCHIVE = {
  tasks: [],
  habits: [],
  reminders: [],
};

export function getArchive() {
  return (
    JSON.parse(localStorage.getItem("archivedItems")) ||
    DEFAULT_ARCHIVE
  );
}

export function saveArchive(data) {
  localStorage.setItem("archivedItems", JSON.stringify(data));
}

/* ===== TASK ===== */
export function archiveTask(task) {
  const archive = getArchive();
  archive.tasks.push(task);
  saveArchive(archive);
}

/* ===== HABIT ===== */
export function archiveHabit(habit) {
  const archive = getArchive();
  archive.habits.push(habit);
  saveArchive(archive);
}

/* ===== REMINDER ===== */
export function archiveReminder(reminder) {
  const archive = getArchive();
  archive.reminders.push(reminder);
  saveArchive(archive);
}
