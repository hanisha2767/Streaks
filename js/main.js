
/* =======================
   Utility / Safety checks
   ======================= */
if (typeof supabase === "undefined") {
  console.error("supabase is not initialized. Make sure you included the supabase client BEFORE main.js");
}

// Minimal fallbacks if auth helpers aren't exported exactly the same
async function _getCurrentUserFallback() {
  if (typeof getCurrentUser === "function") return getCurrentUser();
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch (e) { return null; }
}
async function _getUserProfileFallback() {
  if (typeof getUserProfile === "function") return getUserProfile();
  try {
    const user = await _getCurrentUserFallback();
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    return data;
  } catch (e) { return null; }
}

/* =======================
   DOM helpers
   ======================= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showSection(sectionId) {
  // hide all .section elements, show the chosen one
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.remove("hidden");
  // update active in sidebar
  document.querySelectorAll(".nav-bar-icons").forEach(node => {
    node.classList.toggle("active", node.dataset.section === sectionId.replace("-section",""));
  });
}

/* =======================
   Dashboard state & charts
   ======================= */
let focusWeekChart = null;
let habitsPieChart = null;

function formatDateLong(date = new Date()) {
  return date.toLocaleDateString("en-US", { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

/* =======================
   Data fetch + render
   ======================= */

async function loadAndRenderAll() {
  await loadProfile();
  await renderDashboard();
  await renderHabits();
  await renderTasks();
  await renderReminders();
  await renderArchive();
}

/* -------- profile/topbar -------- */
async function loadProfile() {
  const user = await _getCurrentUserFallback();
  if (!user) {
    // if not logged in redirect to login
    window.location.href = "/Streaks/login.html";
    return;
  }
  const profile = await _getUserProfileFallback();
  const displayName = profile?.username ? ("@" + profile.username) : ("@" + (profile?.email?.split("@")[0] || "user"));
  const email = profile?.email || user.email || "";
  // top bar IDs in your HTML: topName + profile email nodes
  const topName = document.getElementById("topName") || document.getElementById("profileUsername");
  const topEmail = document.getElementById("profileEmail");
  if (topName) topName.textContent = displayName;
  if (topEmail) topEmail.textContent = email;
}

/* -------- Dashboard rendering -------- */
async function renderDashboard() {
  // date + greeting
  const dateEl = document.getElementById("dateDisplay") || document.getElementById("currentDate");
  if (dateEl) dateEl.textContent = formatDateLong();

  const greetingEl = document.getElementById("greeting");
  if (greetingEl) {
    const hr = new Date().getHours();
    if (hr < 12) greetingEl.textContent = "Good morning";
    else if (hr < 18) greetingEl.textContent = "Good afternoon";
    else greetingEl.textContent = "Good evening";
  }

  // totals
  const profile = await _getUserProfileFallback();
  if (!profile) return;

  const userId = profile.id;

  // habits total & completed (completed today)
  const todayISO = new Date().toISOString().slice(0,10);
  const { data: habits } = await supabase.from("habits").select("*").eq("user_id", userId);
  const totalHabits = habits ? habits.length : 0;

  const { data: completionsToday } = await supabase
    .from("habit_completions")
    .select("habit_id")
    .eq("user_id", userId)
    .eq("completed_date", todayISO);

  const completedCount = completionsToday ? new Set(completionsToday.map(c => c.habit_id)).size : 0;

  const habitCountEl = document.getElementById("habits-total");
  const habitCompletedEl = document.getElementById("habits-completed");
  if (habitCountEl) habitCountEl.textContent = totalHabits;
  if (habitCompletedEl) habitCompletedEl.textContent = completedCount;

  // tasks due today
  const { data: tasksToday } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", false)
    .gte("due_date", todayISO)  // include today or future, we'll filter for exact today
  ;
  const tasksDueToday = (tasksToday || []).filter(t => t.due_date === todayISO).length;
  const todoCountEl = document.getElementById("todo-count") || document.getElementById("taskCount");
  if (todoCountEl) todoCountEl.textContent = tasksDueToday;

  // reminders upcoming (next 7 days)
  const today = new Date();
  const in7 = new Date(); in7.setDate(today.getDate()+7);
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .gte("reminder_date", today.toISOString().slice(0,10))
    .lte("reminder_date", in7.toISOString().slice(0,10))
    .order("reminder_date", { ascending: true })
  ;
  const reminderCountEl = document.getElementById("reminders-upcoming") || document.getElementById("reminderCount");
  if (reminderCountEl) reminderCountEl.textContent = (reminders || []).length;

  // render reminder list small
  const dashRemList = document.getElementById("dashboardReminderList");
  if (dashRemList) {
    dashRemList.innerHTML = "";
    (reminders || []).slice(0,6).forEach(r => {
      const li = document.createElement("li");
      li.className = "upcoming-rem-item";
      li.innerHTML = `<span>${r.title}</span><span class="upcoming-rem-date">${r.reminder_date}</span>`;
      dashRemList.appendChild(li);
    });
  }

  // CHARTS: Focus hours week (we approximate by tasks' focus_time by date within last 7 days)
  await renderFocusWeekChart(userId);
  await renderHabitsPie(userId);
}

/* -------- Charts -------- */
async function renderFocusWeekChart(userId) {
  // prepare labels for last 7 days
  const days = [];
  const labels = [];
  for (let i = 6; i >= 0; --i) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0,10));
    labels.push(d.toLocaleDateString("en-US", { weekday:'short' }));
  }

  // fetch tasks due/completed in last 7 days and sum focus_time per day (best-effort)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .in("due_date", days);

  const sums = days.map(day => {
    return (tasks || []).filter(t => t.due_date === day).reduce((s, t) => s + (t.focus_time || 0), 0);
  });

  const ctx = document.getElementById("focusWeekChart");
  if (!ctx) return;
  if (focusWeekChart) focusWeekChart.destroy();
  focusWeekChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Focus minutes', data: sums }]
    },
    options: { responsive:true, maintainAspectRatio:false }
  });
}

async function renderHabitsPie(userId) {
  // simple categories: completed today vs not
  const todayISO = new Date().toISOString().slice(0,10);
  const { data: habits } = await supabase.from("habits").select("*").eq("user_id", userId);
  const { data: comps } = await supabase.from("habit_completions").select("habit_id").eq("user_id", userId).eq("completed_date", todayISO);

  const completedIds = new Set((comps||[]).map(c=>c.habit_id));
  const completed = (habits||[]).filter(h=>completedIds.has(h.id)).length;
  const notCompleted = (habits||[]).length - completed;

  const ctx = document.getElementById("habitsPie");
  if (!ctx) return;
  if (habitsPieChart) habitsPieChart.destroy();
  habitsPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed today','Remaining'],
      datasets: [{ data: [completed, Math.max(notCompleted,0)] }]
    },
    options: { responsive:true, maintainAspectRatio:false }
  });
}

/* =======================
   HABITS UI
   ======================= */
async function renderHabits() {
  const containerId = "habits-section";
  const container = document.getElementById(containerId);
  if (!container) return;

  // Build markup for habits list if empty
  // We'll create left card with list + Add button
  container.innerHTML = `
    <div class="habits-card">
      <div class="card-header">
        <h3>Habits</h3>
        <div>
          <button id="openAddHabit" class="btn">+ Add Habit</button>
        </div>
      </div>
      <p class="habits-date">Today</p>
      <ul class="habit-list" id="habitList"></ul>
    </div>
  `;

  // attach event to open modal
  document.getElementById("openAddHabit").addEventListener("click", () => {
    document.getElementById("habitModal").classList.remove("hidden");
  });

  // load habits from Supabase
  const profile = await _getUserProfileFallback();
  if (!profile) return;
  const userId = profile.id;
  const { data: habits } = await supabase.from("habits").select("*").eq("user_id", userId).order("created_at", { ascending: true });

  const list = document.getElementById("habitList");
  list.innerHTML = "";

  (habits || []).forEach(h => {
    const li = document.createElement("li");
    li.className = "habit-item";
    li.innerHTML = `
      <div class="habit-main-row">
        <input type="checkbox" data-habit-id="${h.id}" class="habit-toggle">
        <div class="habit-main">
          <div class="habit-text">${escapeHtml(h.name)}</div>
        </div>
      </div>
      <div class="habit-actions">
        <button class="icon-btn delete-habit" data-id="${h.id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });

  // hook up events: toggle complete -> create/delete habit_completions
  list.querySelectorAll(".habit-toggle").forEach(ch => {
    ch.addEventListener("change", async (ev) => {
      const hid = ev.target.dataset.habitId;
      const checked = ev.target.checked;
      const today = new Date().toISOString().slice(0,10);
      if (checked) {
        await supabase.from("habit_completions").insert({ habit_id: hid, user_id: userId, completed_date: today });
      } else {
        await supabase.from("habit_completions").delete().eq("habit_id", hid).eq("user_id", userId).eq("completed_date", today);
      }
      // refresh counts & charts
      await renderDashboard();
    });
  });

  // delete habit
  list.querySelectorAll(".delete-habit").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      const hid = ev.target.dataset.id;
      // move to archive table (if exists) or just delete
      try {
        // optional: insert into archive table
        const { data } = await supabase.from("habits").select("*").eq("id", hid).maybeSingle();
        if (data) {
          // try inserting into archive (if table exists)
          await supabase.from("archive").insert({ user_id: userId, item_type: "habit", payload: data });
        }
      } catch (e) {
        // ignore archive errors
      }
      await supabase.from("habits").delete().eq("id", hid);
      await renderHabits();
      await renderDashboard();
    });
  });

  // modal buttons for habit
  // Save habit
  const saveHabitBtn = document.getElementById("saveHabit");
  const cancelHabitBtn = document.getElementById("cancelHabit");
  if (saveHabitBtn) {
    saveHabitBtn.onclick = async () => {
      const name = document.getElementById("habitName").value.trim();
      const freq = document.querySelector('input[name="freq"]:checked')?.value || "daily";
      const customDaysEls = Array.from(document.querySelectorAll("#customDays input[type='checkbox']:checked"));
      const customDays = customDaysEls.map(el => Number(el.dataset.day));
      if (!name) return alert("Enter a habit name");
      await supabase.from("habits").insert({
        id: undefined, user_id: userId, name, frequency: freq, custom_days: (freq === "custom" ? customDays : null)
      });
      document.getElementById("habitModal").classList.add("hidden");
      // clear form
      document.getElementById("habitName").value = "";
      document.querySelectorAll("#customDays input[type='checkbox']").forEach(ch => ch.checked = false);
      await renderHabits();
      await renderDashboard();
    };
  }
  if (cancelHabitBtn) {
    cancelHabitBtn.onclick = () => {
      document.getElementById("habitModal").classList.add("hidden");
    };
  }

  // show/hide customDays area based on frequency radio
  document.querySelectorAll('input[name="freq"]').forEach(r => {
    r.addEventListener("change", () => {
      const custom = document.querySelector('input[name="freq"]:checked')?.value === "custom";
      const cd = document.getElementById("customDays");
      if (cd) cd.classList.toggle("hidden", !custom);
    });
  });
}

/* =======================
   TASKS UI
   ======================= */
async function renderTasks() {
  const container = document.getElementById("todo-section");
  if (!container) return;

  // Build base UI if empty
  container.innerHTML = `
    <div class="todo-page">
      <h2 class="todo-title">To-Do List</h2>
      <div class="todo-actions">
        <input id="taskSearch" class="todo-search" placeholder="Search tasks...">
        <div>
          <button id="openAddTask" class="btn">+ Add Task</button>
        </div>
      </div>
      <div id="taskGrid" class="task-grid"></div>
    </div>
  `;

  document.getElementById("openAddTask").addEventListener("click", () => {
    document.getElementById("todoModal").classList.remove("hidden");
    document.getElementById("todoModalTitle").textContent = "Add Task";
  });

  const profile = await _getUserProfileFallback();
  if (!profile) return;
  const userId = profile.id;

  // load tasks
  const { data: tasks } = await supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });

  const grid = document.getElementById("taskGrid");
  grid.innerHTML = "";
  (tasks || []).forEach(t => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.dataset.id = t.id;
    card.innerHTML = `
      <div class="task-top">
        <input type="checkbox" class="task-check" ${t.completed ? "checked" : ""} data-id="${t.id}">
        <div>
          <h3 class="task-name ${t.completed ? "completed" : ""}">${escapeHtml(t.name)}</h3>
          <div class="task-details">
            <div class="task-info">${t.due_date || ""}</div>
            <div class="task-info">${t.focus_time || 0} min</div>
            <div class="task-info priority ${t.category || "q1"}">${t.category?.toUpperCase() || "Q1"}</div>
          </div>
        </div>
      </div>
      <div class="task-actions-grid">
        <button class="task-btn edit-task" data-id="${t.id}">Edit</button>
        <button class="task-btn delete-task" data-id="${t.id}">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // hook checkbox events
  grid.querySelectorAll(".task-check").forEach(cb => {
    cb.addEventListener("change", async (ev) => {
      const id = ev.target.dataset.id;
      const checked = ev.target.checked;
      await supabase.from("tasks").update({ completed: checked }).eq("id", id);
      await renderTasks();
      await renderDashboard();
    });
  });

  // delete task
  grid.querySelectorAll(".delete-task").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      const id = ev.target.dataset.id;
      try {
        // optional archive
        const { data } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
        if (data) await supabase.from("archive").insert({ user_id: userId, item_type: "task", payload: data });
      } catch(e){}
      await supabase.from("tasks").delete().eq("id", id);
      await renderTasks();
      await renderDashboard();
    });
  });

  // modal handlers
  document.getElementById("saveTask").onclick = async () => {
    const name = document.getElementById("taskName").value.trim();
    const due = document.getElementById("taskDueDate").value || null;
    const focus = Number(document.getElementById("taskTime").value || 0);
    const cat = document.getElementById("taskMatrixType").value || "q1";
    if (!name) return alert("Enter task name");
    await supabase.from("tasks").insert({ user_id: userId, name, due_date: due, focus_time: focus, category: cat, completed: false });
    document.getElementById("todoModal").classList.add("hidden");
    document.getElementById("taskName").value = "";
    document.getElementById("taskDueDate").value = "";
    document.getElementById("taskTime").value = "";
    await renderTasks();
    await renderDashboard();
  };

  document.getElementById("cancelTask").onclick = () => {
    document.getElementById("todoModal").classList.add("hidden");
  };
}

/* =======================
   REMINDERS UI
   ======================= */
async function renderReminders() {
  const container = document.getElementById("reminders-section");
  if (!container) return;

  container.innerHTML = `
    <div class="reminder-card">
      <div class="card-header">
        <h3>Reminders</h3>
        <div><button id="openAddReminder" class="btn">+ Add Reminder</button></div>
      </div>
      <ul class="reminder-list" id="reminderList"></ul>
    </div>
  `;

  document.getElementById("openAddReminder").addEventListener("click", () => {
    document.getElementById("reminderModal").classList.remove("hidden");
  });

  const profile = await _getUserProfileFallback();
  if (!profile) return;
  const userId = profile.id;

  const { data: reminders } = await supabase.from("reminders").select("*").eq("user_id", userId).order("reminder_date", { ascending: true });
  const list = document.getElementById("reminderList");
  list.innerHTML = "";
  (reminders || []).forEach(r => {
    const li = document.createElement("li");
    li.className = "reminder-item";
    li.innerHTML = `
      <div class="reminder-info">
        <strong>${escapeHtml(r.title)}</strong>
        <p class="reminder-time">${r.reminder_date} ${r.reminder_time || ""}</p>
      </div>
      <div>
        <button class="icon-btn delete-reminder" data-id="${r.id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll(".delete-reminder").forEach(btn => {
    btn.addEventListener("click", async (ev) => {
      const id = ev.target.dataset.id;
      try {
        const { data } = await supabase.from("reminders").select("*").eq("id", id).maybeSingle();
        if (data) await supabase.from("archive").insert({ user_id: userId, item_type: "reminder", payload: data });
      } catch (e) { }
      await supabase.from("reminders").delete().eq("id", id);
      await renderReminders();
      await renderDashboard();
    });
  });

  // modal handlers
  document.getElementById("saveReminder").onclick = async () => {
    const title = document.getElementById("reminderTitle").value.trim();
    const date = document.getElementById("reminderDate").value;
    const time = document.getElementById("reminderTime").value;
    if (!title || !date) return alert("Enter title and date");
    await supabase.from("reminders").insert({ user_id: userId, title, reminder_date: date, reminder_time: time });
    document.getElementById("reminderModal").classList.add("hidden");
    document.getElementById("reminderTitle").value = "";
    document.getElementById("reminderDate").value = "";
    document.getElementById("reminderTime").value = "";
    await renderReminders();
    await renderDashboard();
  };

  document.getElementById("cancelReminder").onclick = () => {
    document.getElementById("reminderModal").classList.add("hidden");
  };
}

/* =======================
   ARCHIVE UI
   ======================= */
async function renderArchive() {
  const container = document.getElementById("archive-section");
  if (!container) return;

  // try reading from 'archive' table; if doesn't exist, show message
  const profile = await _getUserProfileFallback();
  if (!profile) return;
  const userId = profile.id;

  try {
    const { data: archive } = await supabase.from("archive").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    container.innerHTML = `<div class="archive-page">${(archive || []).map(a => `
      <div class="archive-item">
        <div class="archive-info">
          <h3>${escapeHtml(a.item_type)}</h3>
          <p>${escapeHtml(JSON.stringify(a.payload || {}).slice(0,200))}</p>
        </div>
        <div class="archive-actions">
          <button class="restore-btn restore" data-id="${a.id}">Restore</button>
          <button class="delete-btn delete" data-id="${a.id}">Delete</button>
        </div>
      </div>
    `).join("")}</div>`;

    // restore/delete handlers (restore simply reinserts into appropriate table)
    container.querySelectorAll(".restore").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        const id = ev.target.dataset.id;
        const { data: row } = await supabase.from("archive").select("*").eq("id", id).maybeSingle();
        if (!row) return alert("No archived item");
        const payload = row.payload || {};
        if (row.item_type === "task") {
          await supabase.from("tasks").insert(payload);
        } else if (row.item_type === "habit") {
          await supabase.from("habits").insert(payload);
        } else if (row.item_type === "reminder") {
          await supabase.from("reminders").insert(payload);
        }
        await supabase.from("archive").delete().eq("id", id);
        await renderArchive();
        await renderHabits();
        await renderTasks();
        await renderReminders();
        await renderDashboard();
      });
    });

    container.querySelectorAll(".delete").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        const id = ev.target.dataset.id;
        await supabase.from("archive").delete().eq("id", id);
        await renderArchive();
      });
    });

  } catch (e) {
    container.innerHTML = `<div class="empty-archive">No archive table found. Deleted items are permanently removed.</div>`;
  }
}

/* =======================
   Common helpers & init
   ======================= */
function escapeHtml(text) {
  if (text === undefined || text === null) return "";
  return String(text).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"}[m]));
}

/* =======================
   Page navigation + init listeners
   ======================= */
function setupNavListeners() {
  document.querySelectorAll(".nav-bar-icons").forEach(el => {
    el.addEventListener("click", () => {
      const section = el.dataset.section;
      showSection(section + "-section");
      // lazy render target section if needed
      if (section === "habits") renderHabits();
      if (section === "todo") renderTasks();
      if (section === "reminders") renderReminders();
      if (section === "archive") renderArchive();
    });
  });

  // logout wrapper - call logout from auth.js if provided, otherwise supabase signOut
  const logoutW = document.querySelector(".logout-wrapper");
  if (logoutW) {
    logoutW.addEventListener("click", async () => {
      if (typeof logout === "function") {
        await logout();
      } else {
        await supabase.auth.signOut();
      }
      window.location.href = "/Streaks/login.html";
    });
  }

  // close modals on outside click
  document.querySelectorAll(".modal").forEach(m => {
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.add("hidden");
    });
  });

  // habit custom day toggles (visual)
  document.querySelectorAll("#customDays label").forEach(lbl => {
    lbl.addEventListener("click", () => lbl.classList.toggle("selected"));
  });
}

/* =======================
   Run init
   ======================= */
window.addEventListener("load", async () => {
  setupNavListeners();
  await loadAndRenderAll();
});
