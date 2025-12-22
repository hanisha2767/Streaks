import { supabase } from "./supabaseClient";

/* ================================
   CONFIG
================================ */
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/* ================================
   AUTH TOKEN
================================ */
async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("User not authenticated");
  }

  return session.access_token;
}

/* ================================
   GENERIC FETCH
================================ */
export async function apiFetch(path, options = {}) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API request failed");
  }

  return res.json();
}

/* ================================
   DASHBOARD
================================ */
export function getDashboardSummary() {
  return apiFetch("/dashboard/summary");
}

/* ================================
   FOCUS HOURS
================================ */
export function getWeeklyFocus() {
  return apiFetch("/focus/weekly");
}

export function addFocusSession(minutes) {
  return apiFetch("/focus", {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });
}

/* ================================
   HABITS
================================ */
export function getHabits() {
  return apiFetch("/habits");
}

export function addHabit(payload) {
  return apiFetch("/habits", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHabit(id, payload) {
  return apiFetch(`/habits/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteHabit(id) {
  return apiFetch(`/habits/${id}`, {
    method: "DELETE",
  });
}

export function completeHabit(id) {
  return apiFetch(`/habits/${id}/complete`, {
    method: "POST",
  });
}

export function resetHabitToday(id) {
  return apiFetch(`/habits/${id}/reset`, {
    method: "POST",
  });
}

/* ================================
   TODOS
================================ */
export function getTodos() {
  return apiFetch("/tasks");
}

export function addTodo(payload) {
  return apiFetch("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTodo(id, payload) {
  return apiFetch(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTodo(id) {
  return apiFetch(`/tasks/${id}`, {
    method: "DELETE",
  });
}

export function completeTodo(id) {
  return apiFetch(`/tasks/${id}/complete`, {
    method: "POST",
  });
}

/* ================================
   REMINDERS
================================ */
export function getReminders() {
  return apiFetch("/reminders");
}

export function addReminder(payload) {
  return apiFetch("/reminders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateReminder(id, payload) {
  return apiFetch(`/reminders/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteReminder(id) {
  return apiFetch(`/reminders/${id}`, {
    method: "DELETE",
  });
}

export function completeReminder(id) {
  return apiFetch(`/reminders/${id}/complete`, {
    method: "POST",
  });
}
