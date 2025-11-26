// ===== Date Utility =====
document.fonts && document.fonts.ready.then(() => {
  console.log("Fonts loaded");
});

if (!localStorage.getItem("username")) {
  window.location.href = "welcome.html";
}
function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===== Local Storage Helpers =====
function getHabits() { return JSON.parse(localStorage.getItem('habits') || '[]'); }
function saveHabits(h) { localStorage.setItem('habits', JSON.stringify(h)); }

function getDailyProgress(k) { return JSON.parse(localStorage.getItem(`habitProgress_${k}`) || '{}'); }
function saveDailyProgress(k, v) { localStorage.setItem(`habitProgress_${k}`, JSON.stringify(v)); }

// ====================== BACKEND TASK API ======================

const API_BASE = "http://localhost:5000";   // change if needed
const TOKEN = localStorage.getItem("token");

// GET USER TASKS
async function getTasks() {
    const res = await fetch(`${API_BASE}/tasks/list`, {
        headers: { "Authorization": `Bearer ${TOKEN}` }
    });
    return await res.json();
}

// ADD TASK
async function addTask(taskData) {
    const res = await fetch(`${API_BASE}/tasks/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKEN}`
        },
        body: JSON.stringify(taskData)
    });

    return await res.json();
}

// DELETE TASK
async function deleteTask(id) {
    await fetch(`${API_BASE}/tasks/delete/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${TOKEN}` }
    });
}

// COMPLETE TASK
async function completeTask(id) {
    await fetch(`${API_BASE}/tasks/complete/${id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${TOKEN}` }
    });
}

// Archive is stored on backend — no need for localStorage version
async function getArchive() {
    // If you want archives from backend later, add route
    return [];
}
async function saveArchive(a) {
    // Not needed unless backend supports it
}

function getReminders() { return JSON.parse(localStorage.getItem('reminders') || '[]'); }
function saveReminders(r) { localStorage.setItem('reminders', JSON.stringify(r)); }

// ===== Helpers =====
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]
  ));
}

function readableDate() {
  const now = new Date();
  const opt = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  return now.toLocaleDateString(undefined, opt);
}

// ===== Streak Calculation =====
function getStreak(habitId) {
  const habits = getHabits();
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return 0;

  let streak = 0;
  let current = new Date();
  const maxCheck = 365; // Safety limit

  for (let i = 0; i < maxCheck; i++) {
    const key = todayKey(current);
    const weekday = current.getDay();
    let isDue = false;

    switch (habit.freq) {
      case 'daily':
        isDue = true;
        break;
      case 'weekdays':
        isDue = weekday >= 1 && weekday <= 5;
        break;
      case 'weekends':
        isDue = weekday === 0 || weekday === 6;
        break;
      case 'custom':
        isDue = habit.days?.includes(weekday);
        break;
    }

    if (isDue) {
      const progress = getDailyProgress(key);
      if (!progress[habitId]) {
        // if today is incomplete → skip it and continue streak from yesterday
        if (i === 0) {
            current.setDate(current.getDate() - 1);
            continue;
        }
        break;
    }
    streak++;
    
    }

    current.setDate(current.getDate() - 1);
  }

  return streak;
}

// ===== Global Vars =====
let navItems, mainContent;
let modal, habitNameIn, customDaysWrap, saveHabitBtn, cancelHabitBtn;
let todoModal, saveTaskBtn, cancelTaskBtn;
let reminderModal, saveReminderBtn, cancelReminderBtn;

window.focusWeekChart = null;
window.habitsPie = null;

// ===== Init =====
window.addEventListener('DOMContentLoaded', () => {
  navItems = document.querySelectorAll('.nav-bar-icons');
  mainContent = document.getElementById('main-content');

  modal = document.getElementById('habitModal');
  habitNameIn = document.getElementById('habitName');
  customDaysWrap = document.getElementById('customDays');
  saveHabitBtn = document.getElementById('saveHabit');
  cancelHabitBtn = document.getElementById('cancelHabit');

  todoModal = document.getElementById('todoModal');
  saveTaskBtn = document.getElementById('saveTask');
  cancelTaskBtn = document.getElementById('cancelTask');

  reminderModal = document.getElementById('reminderModal');
  saveReminderBtn = document.getElementById('saveReminder');
  cancelReminderBtn = document.getElementById('cancelReminder');

  let originalDashboardHTML = '';
  const dashboardSection = document.getElementById('dashboard-section');
  if (dashboardSection) originalDashboardHTML = dashboardSection.outerHTML;

  // Sidebar navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const section = item.getAttribute('data-section');
      localStorage.setItem('activeSection', section);

      if (section === 'dashboard') {
        mainContent.innerHTML = originalDashboardHTML || `
          <section id="dashboard-section">
            <div class="date-div">
              <p class="date"><span class="date-num"></span></p>
              <div class="middle-part"></div>
            </div>
            <div class="charts-grid">
              <div class="chart-container"><p class="title-middle">Focus Hours (This Week)</p><canvas id="focusWeekChart"></canvas></div>
              <div class="chart-container"><p class="title-middle">Habits Overview</p><canvas id="habitsPie"></canvas></div>
              <div class="chart-container reminders-mini">
                <p class="title-middle">Upcoming Reminders</p>
                <div id="dashboardReminders"></div>
              </div>

            </div>
          </section>`;
        renderDashboard();
      } else if (section === 'habits') renderHabitsCard();
      else if (section === 'todo') renderTodoPage();
      else if (section === 'reminders') renderRemindersPage();
      else if (section === 'archive') renderArchivePage();
    });
  });

  // Load last opened section
  const lastSection = localStorage.getItem('activeSection') || 'dashboard';
  setTimeout(() => document.querySelector(`.nav-bar-icons[data-section="${lastSection}"]`)?.click(), 0);

  // Toggle custom days visibility
  document.querySelectorAll('input[name="freq"]').forEach(r => {
    r.addEventListener('change', () => {
      const val = document.querySelector('input[name="freq"]:checked').value;
      customDaysWrap.classList.toggle('hidden', val !== 'custom');
    });
  });

  // Close modals when clicking outside
  [modal, todoModal, reminderModal].forEach(m => {
    if (m) m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
  });

  // Cancel buttons
  if (cancelHabitBtn) cancelHabitBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', () => todoModal.classList.add('hidden'));
  if (cancelReminderBtn) cancelReminderBtn.addEventListener('click', () => reminderModal.classList.add('hidden'));

  // Save habit
  if (saveHabitBtn) {
    saveHabitBtn.addEventListener('click', () => {
      const name = habitNameIn.value.trim();
      if (!name) return alert('Enter a habit name');
      const freq = document.querySelector('input[name="freq"]:checked').value;
      let days = [];

      if (freq === 'custom') {
        customDaysWrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (cb.checked) days.push(Number(cb.dataset.day));
        });
        if (!days.length) return alert('Select at least one day');
      }

      const habits = getHabits();
      let editId = saveHabitBtn.dataset.editId;
      if (editId) {
        const idx = habits.findIndex(h => h.id === editId);
        if (idx >= 0) Object.assign(habits[idx], { name, freq, days });
      } else {
        habits.push({
          id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
          name, freq, days
        });
      }

      saveHabits(habits);
      modal.classList.add('hidden');
      if (document.getElementById('habitList')) renderTodaysList();
      updateDashboardStats();
      renderDashboardCharts();
    });
  }
  ctx.font = `${height / 7}px "Poppins", sans-serif`;
  ctx.font = `${height / 14}px "Poppins", sans-serif`;

  // Save task
  document.addEventListener('click', async e => {
    if (e.target && e.target.id === 'saveTask') {
        
      const name = document.getElementById('taskName').value.trim();
      const due = document.getElementById('taskDueDate').value;
      // prevent past date on save
      if (due && due < todayKey()) {
        return alert("You cannot select a past date.");
      }
      const time = Number(document.getElementById('taskTime').value) || 0;
      const matrixType = document.getElementById('taskMatrixType').value;
  
      if (!name.trim()) return alert("Task name is required.");

      if (!due) return alert("Please select a due date."); 

      if (new Date(due) < new Date().setHours(0,0,0,0)) {
        return alert("You cannot choose a past date.");
      }

      if (!matrixType) return alert("Please select a matrix category.");

  
      // 🔥 Save to backend instead of localStorage
      await addTask({
        title: name,
        description: "",
        dueDate: due,
        matrixType: matrixType,
        focusTime: time
      });

      todoModal.classList.add('hidden');
  
      // 🔥🔥 MAIN FIX 🔥🔥
      // Re-render the entire Matrix page
      renderTodoPage();       
  
      // Load tasks into all 4 quadrants
      renderMatrixTasks();
  
      updateDashboardStats();
      renderDashboardCharts();
    }
  });  

  // Top date
  const el = document.querySelector('.date');
  if (el) {
    const t = new Date();
    el.innerHTML = `<span class="date-num">${String(t.getDate()).padStart(2, '0')}</span> ${t.toLocaleString('default',{month:'short'})} ${t.getFullYear()}`;
  }
});

function ensureTaskDates() {
  const tasks = getTasks();
  let updated = false;
  const today = todayKey();

  tasks.forEach(t => {
    if (t.completed && !t.completedDate) {
      // Default to the date it was last modified or today
      t.completedDate = today;
      updated = true;
    }
  });

  if (updated) saveTasks(tasks);
}

function archiveTask(task) {
  const archive = getArchive();
  archive.push({
    ...task,
    archivedAt: todayKey()
  });
  saveArchive(archive);
}


// ===== Dashboard =====
function renderDashboard() {
  ensureTaskDates();
  updateDashboardStats();
  renderDashboardCharts();
  generateHabitCalendar();
  renderDashboardReminders();


  const t = new Date();
  const dateEl = document.querySelector('.date');
  if (dateEl)
    dateEl.innerHTML = `<span class="date-num">${String(t.getDate()).padStart(2, '0')}</span> ${t.toLocaleString('default',{month:'short'})} ${t.getFullYear()}`;
}

function renderDashboardReminders() {
  const list = document.getElementById("dashboardReminderList");
  if (!list) return;

  let reminders = getReminders();

  // Sort by earliest datetime
  reminders.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  // Show only top 3 upcoming
  reminders = reminders.slice(0, 3);

  if (reminders.length === 0) {
    list.innerHTML = `<li>No upcoming reminders!</li>`;
    return;
  }

  list.innerHTML = reminders.map(r => {
    const dt = new Date(r.datetime);
    return `
      <li>
        <span>${escapeHtml(r.title)}</span>
        <span class="reminder-mini-date">
          ${dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </li>
    `;
  }).join("");
}

function renderDashboardCharts() {
  // Destroy previous charts
  [window.focusWeekChart, window.habitsPie].forEach(ch => ch?.destroy?.());

  /* ==========================
     FOCUS HOURS LINE GRAPH
  ========================== */
  const weekCtx = document.getElementById('focusWeekChart');
  if (weekCtx) {
    const weekData = getWeekFocusData();

    window.focusWeekChart = new Chart(weekCtx, {
      type: 'line',
      data: {
        labels: weekData.labels,
        datasets: [{
          data: weekData.hours,
          borderColor: '#05c26a',
          backgroundColor: 'rgba(5,194,106,0.08)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        plugins: {
          legend: { display: false }
        },
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }},
          y: {
            grid: { display: false },
            ticks: {
              display: true,
              color: "#A6ADBA",
              font: {
                size: 12
              }
            },
            title: {
              display: true,
              color: "#ffffff",
              font: {
                size: 14,
                weight: "600"
              }
            }
          }
          
          
        }
      }
    });
  }

  /* ==========================
     HABIT PROGRESS RING
  ========================== */
  const pieCtx = document.getElementById('habitsPie');
if (pieCtx) {
  const { completed, pending } = getHabitsPieData();
  const total = completed + pending;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  // motivational message
  let msg = "Let's go!";
  if (percent >= 80) msg = "Way to go!";
  else if (percent >= 50) msg = "Keep it up!";
  else if (percent >= 20) msg = "You got this!";

  // ⭐ CUSTOM PLUGIN FOR CENTER TEXT ⭐
  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea: { width, height } } = chart;

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // percentage
      ctx.fillStyle = "#ffffff";
      ctx.font = `${height / 7}px Poppins`;
      ctx.fillText(`${percent}%`, width / 2, height / 2 - 10);

      // message text
      ctx.fillStyle = "#A6ADBA";
      ctx.font = `${height / 14}px Poppins`;
      ctx.fillText(msg, width / 2, height / 2 + 25);

      ctx.restore();
    }
  };

  window.habitsPie = new Chart(pieCtx, {
    type: 'doughnut',
    plugins: [centerTextPlugin],  // ⭐ required ⭐
    data: {
      datasets: [{
        data: [completed, pending],
        backgroundColor: ['#05c26a', '#1c2230'],
        borderWidth: 0,

        // ⭐ MAKE RING THINNER ⭐
        cutout: '88%' 
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}
}

function getWeekFocusData() {
  const tasks = getTasks().filter(t => t.completed && t.completedDate);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);

  const labels = [], hours = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const key = todayKey(d);
    const mins = tasks
      .filter(t => t.completedDate === key)
      .reduce((s, t) => s + (Number(t.focusTime) || 0), 0);

    labels.push(`${d.getDate()} ${d.toLocaleString('default',{month:'short'})}`);
    hours.push(Number((mins / 60).toFixed(1))); // FIXED
  }

  return { labels, hours };
}


function getHabitsPieData() {
  const habits = getHabits();
  const today = todayKey();
  const progress = getDailyProgress(today);
  const weekday = new Date().getDay();
  const todays = habits.filter(h => {
    if (h.freq === 'daily') return true;
    if (h.freq === 'weekdays') return weekday >= 1 && weekday <= 5;
    if (h.freq === 'weekends') return weekday === 0 || weekday === 6;
    if (h.freq === 'custom') return h.days?.includes(weekday);
    return false;
  });

  const completed = todays.filter(h => progress[h.id]).length;
  return { completed, pending: todays.length - completed };
}

function updateDashboardStats() {
  const tasks = getTasks();
  const today = todayKey();

  const pendingTasks = tasks.filter(t => !t.completed).length;
document.getElementById('todo-count')?.replaceChildren(pendingTasks);


  const doneToday = tasks.filter(t => t.completed && t.completedDate === today);
  const mins = doneToday.reduce((s, t) => s + (Number(t.focusTime) || 0), 0);
  document.getElementById('focus-hours')?.replaceChildren((mins / 60).toFixed(1));

  const habits = getHabits();
  const weekday = new Date().getDay();
  const todays = habits.filter(h => {
    if (h.freq === 'daily') return true;
    if (h.freq === 'weekdays') return weekday >= 1 && weekday <= 5;
    if (h.freq === 'weekends') return weekday === 0 || weekday === 6;
    if (h.freq === 'custom') return h.days?.includes(weekday);
    return false;
  });

  const prog = getDailyProgress(today);
  const done = todays.reduce((s, h) => s + (prog[h.id] ? 1 : 0), 0);
  document.getElementById('habits-completed')?.replaceChildren(done);
  document.getElementById('habits-total')?.replaceChildren(todays.length);

  const upcoming = getReminders().filter(r => new Date(r.datetime) >= new Date()).length;
  document.getElementById('reminders-upcoming')?.replaceChildren(upcoming);
}




// ================= HABITS PAGE =================
function renderHabitsCard() {
  mainContent.innerHTML = `
    <div class="habits-card">
      <div class="card-header">
        <h3>Habits</h3>
        <div>
          <button id="openAdd" class="icon-btn">＋ New</button>
          <button id="openManage" class="icon-btn">More</button>
        </div>
      </div>
      <div class="habits-date">${readableDate()}</div>
      <ul id="habitList" class="habit-list"></ul>
      <div class="card-controls">
        <button id="openAddBottom" class="btn ghost">Add habit</button>
        <div style="flex:1"></div>
        <button id="resetToday" class="btn ghost">Reset today</button>
      </div>
    </div>
  `;

  document.getElementById('openAdd').addEventListener('click', () => openHabitModal());
  document.getElementById('openAddBottom').addEventListener('click', () => openHabitModal());
  document.getElementById('resetToday').addEventListener('click', () => {
    saveDailyProgress(todayKey(), {});
    renderTodaysList();
    updateDashboardStats();
  });

  renderTodaysList();
}

function renderTodaysList() {
  const list = document.getElementById('habitList');
  if (!list) return;

  const habits = getHabits();
  const today = todayKey();
  const progress = getDailyProgress(today);
  const weekday = new Date().getDay();

  const todays = habits.filter(h => {
    if (h.freq === 'daily') return true;
    if (h.freq === 'weekdays') return weekday >= 1 && weekday <= 5;
    if (h.freq === 'weekends') return weekday === 0 || weekday === 6;
    if (h.freq === 'custom') return h.days?.includes(weekday);
    return false;
  });

  // ⭐⭐⭐ SORT BEFORE RENDERING ⭐⭐⭐
  todays.sort((a, b) => {
    const prog = getDailyProgress(today);
    const aDone = prog[a.id] ? 1 : 0;
    const bDone = prog[b.id] ? 1 : 0;

    const aStreak = getStreak(a.id);
    const bStreak = getStreak(b.id);

    // Completed habits go to bottom
    if (aDone !== bDone) return aDone - bDone;

    // Otherwise sort by least streak first
    return aStreak - bStreak;
  });

  list.innerHTML = '';
  if (todays.length === 0) {
    list.innerHTML = `<li style="color:#A6ADBA;padding:12px">No habits today. Add one!</li>`;
    return;
  }

  // ⭐ Now render in correct order
  todays.forEach(h => {
    const streak = getStreak(h.id);
    const checked = progress[h.id] ? 'checked' : '';
    const doneClass = progress[h.id] ? 'done' : '';

    const li = document.createElement('li');
    li.className = 'habit-item';

    li.innerHTML = `
      <div class="habit-left">
        <input type="checkbox" class="habit-checkbox" data-id="${h.id}" ${checked}>
        <span class="habit-text ${doneClass}">${escapeHtml(h.name)}</span>
      </div>

      <div class="habit-right">
        <span class="streak">${streak}</span>
        <button class="icon-btn edit-habit" data-id="${h.id}">Edit</button>
        <button class="icon-btn del-habit" data-id="${h.id}">Delete</button>
      </div>
    `;
    // checkbox handling
list.querySelectorAll('.habit-checkbox').forEach(cb => {
  cb.addEventListener('change', e => {
    const id = e.target.dataset.id;
    const today = todayKey();
    let prog = getDailyProgress(today);

    if (e.target.checked) {
      prog[id] = true;
    } else {
      delete prog[id];
    }

    saveDailyProgress(today, prog);

    // important: re-render AFTER saving
    setTimeout(() => {
      renderTodaysList();
      updateDashboardStats();
      renderDashboardCharts();
    }, 0);
  });
});

    list.appendChild(li);
  });

  // checkbox, edit, delete handlers remain same
}


function openHabitModal(editId = null) {
  const titleEl = document.getElementById('modalTitle');
  titleEl.textContent = editId ? 'Edit Habit' : 'Add Habit';

  modal.classList.remove('hidden');
  habitNameIn.value = '';
  document.querySelector('input[name="freq"][value="daily"]').checked = true;
  customDaysWrap.classList.add('hidden');
  delete saveHabitBtn.dataset.editId;

  if (editId) {
    const h = getHabits().find(x => x.id === editId);
    if (h) {
      habitNameIn.value = h.name;
      document.querySelector(`input[name="freq"][value="${h.freq}"]`).checked = true;
      if (h.freq === 'custom' && h.days) {
        customDaysWrap.classList.remove('hidden');
        h.days.forEach(d => {
          customDaysWrap.querySelector(`input[data-day="${d}"]`).checked = true;
        });
      }
      saveHabitBtn.dataset.editId = editId;
    }
    // ==== DAY BUTTON SELECT EFFECT ====
document.querySelectorAll('#customDays label').forEach(lb => {
  lb.addEventListener('click', () => {
    lb.classList.toggle('selected');
  });
});
// ==== DAY BUTTON SELECT EFFECT ====
document.addEventListener('click', function (e) {
  const lb = e.target.closest('#customDays label');
  if (!lb) return;
  lb.classList.toggle('selected');
});


  }

  // Reset event listener
  const newSaveBtn = saveHabitBtn.cloneNode(true);
  saveHabitBtn.parentNode.replaceChild(newSaveBtn, saveHabitBtn);
  saveHabitBtn = newSaveBtn;

  saveHabitBtn.addEventListener('click', () => {
    const name = habitNameIn.value.trim();
    if (!name) return alert('Enter a habit name');
    const freq = document.querySelector('input[name="freq"]:checked').value;
    let days = [];

    if (freq === 'custom') {
      customDaysWrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.checked) days.push(Number(cb.dataset.day));
      });
      if (!days.length) return alert('Select at least one day');
    }

    const habits = getHabits();

    if (editId) {
      const idx = habits.findIndex(h => h.id === editId);
      if (idx >= 0) Object.assign(habits[idx], { name, freq, days });
    } else {
      habits.push({
        id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
        name, freq, days
      });
    }

    saveHabits(habits);
    modal.classList.add('hidden');
    renderTodaysList();
    updateDashboardStats();
    renderDashboardCharts();
  });
}


// ================= TODO PAGE (Eisenhower Matrix) =================
let editId; // Global for task editing

function renderTodoPage() {
  mainContent.innerHTML = `
    <div class="todo-page">
      <div class="todo-title">To Do List </div>
      <div class="todo-actions">
        <input type="text" id="todoSearch" class="todo-search" placeholder="Search tasks...">
        <div class="todo-filters">
          <button class="todo-filter active" data-filter="all">All</button>
          <button class="todo-filter" data-filter="today">Today</button>
          <button class="todo-filter" data-filter="overdue">Overdue</button>
        </div>
        <button id="addTaskBtn" class="matrix-add-btn">＋ New Task</button>
      </div>

      <div class="matrix-grid">
        <div class="matrix-box" data-type="q1">
          <h2>Urgent & Important</h2>
          <p class="q-desc">Do first: Crises, deadlines</p>
          <ul id="q1-list" class="matrix-list"></ul>
        </div>
        <div class="matrix-box" data-type="q2">
          <h2>Not Urgent & Important</h2>
          <p class="q-desc">Schedule: Planning, relationships</p>
          <ul id="q2-list" class="matrix-list"></ul>
        </div>
        <div class="matrix-box" data-type="q3">
          <h2>Urgent & Not Important</h2>
          <p class="q-desc">Delegate: Interruptions, some meetings</p>
          <ul id="q3-list" class="matrix-list"></ul>
        </div>
        <div class="matrix-box" data-type="q4">
          <h2>Not Urgent & Not Important</h2>
          <p class="q-desc">Delete: Time wasters, busywork</p>
          <ul id="q4-list" class="matrix-list"></ul>
        </div>
      </div>
    </div>
  `;

  document.getElementById('addTaskBtn').addEventListener('click', () => openTodoModal());

  // Search and filter handlers
  document.getElementById('todoSearch').addEventListener('input', renderMatrixTasks);
  document.querySelectorAll('.todo-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMatrixTasks();
    });
  });

  renderMatrixTasks();
}

function renderTaskGrid(filter = 'all') {
  const grid = document.getElementById('taskGrid');
  const search = document.getElementById('taskSearch').value.toLowerCase();

  let tasks = getTasks();

  // filtering
  tasks = tasks.filter(t => {
    if (search && !t.name.toLowerCase().includes(search)) return false;
    if (filter === 'pending') return !t.completed;
    if (filter === 'done') return t.completed;
    if (filter === 'today') return t.dueDate === todayKey();
    return true;
  });

  if (tasks.length === 0) {
    grid.innerHTML = `<p class="todo-empty">No tasks to display.</p>`;
    return;
  }

  grid.innerHTML = tasks.map(t => `
    <div class="task-card ${t.focusTime ? `<span>⏱ ${t.focusTime} min</span>` : ""}>
      <div class="task-top">
        <input type="checkbox" class="task-check" data-id="${t.id}" ${t.completed ? "checked" : ""}>
        <h3 class="task-name">${t.name}</h3>
      </div>

      <div class="task-details">
        ${t.dueDate ? `<p class="task-info">📅 ${t.dueDate}</p>` : ""}
        ${t.focusTime ? `<p class="task-info">⏱ ${t.focusTime} min</p>` : ""}
      </div>

      <div class="task-actions-grid">
        <button class="task-btn edit-task" data-id="${t.id}">Edit</button>
        <button class="task-btn del-task" data-id="${t.id}">Delete</button>
      </div>
    </div>
  `).join("");

  // checkbox handler
  document.querySelectorAll('.task-check').forEach(cb => {
    cb.addEventListener("change", e => {
      const id = e.target.dataset.id;
      let tasks = getTasks();
      const t = tasks.find(x => x.id === id);
      if (!t) return;
  
      if (e.target.checked) {
        // get checkbox screen coords
        const rect = e.target.getBoundingClientRect();
        tinyConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      
        t.completed = true;
        t.completedDate = todayKey();
      
        archiveTask(t);
        saveTasks(tasks);
      }
       else {
        // rare case: someone unchecks from archive restore view  
        t.completed = false;
        saveTasks(tasks);
      }
  
      // update UI
      renderMatrixTasks();
      updateDashboardStats();
      renderDashboardCharts();
    });
  });

  document.querySelectorAll('.edit-task')
    .forEach(btn => btn.addEventListener('click', () => openTodoModal(btn.dataset.id)));

  document.querySelectorAll('.del-task')
  .forEach(btn => btn.addEventListener('click', async () => {
    await deleteTask(btn.dataset.id);
    await renderTaskGrid(filter);
  }));
}


function setActiveFilter(btn) {
  document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active-filter'));
  btn.classList.add('active-filter');
}

function renderTaskList(filter = 'all') {
  const list = document.getElementById('taskList');
  if (!list) return;

  const tasks = getTasks();
  const filtered = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  list.innerHTML = filtered.length === 0
    ? `<li style="color:#A6ADBA;padding:12px">No tasks.</li>`
    : '';

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = 'habit-item';
    const done = task.completed ? 'checked' : '';
    const nameDone = task.completed ? 'completed' : '';
    const due = task.dueDate ? `<span class="due-date">${task.dueDate}</span>` : '';
    const timeTag = task.focusTime > 0 ? `<span class="task-time">Time: ${task.focusTime}m</span>` : '';
    li.innerHTML = `
      <input type="checkbox" data-id="${task.id}" ${done}>
      <div class="habit-text">
        <span class="task-name ${nameDone}">${escapeHtml(task.name)}</span>
        ${due} ${timeTag}
      </div>
      <div class="habit-actions">
        <button class="icon-btn edit-task" data-id="${task.id}">Edit</button>
        <button class="icon-btn del-task" data-id="${task.id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    // In renderTaskList() → checkbox change
    cb.addEventListener("change", e => {
      const id = e.target.dataset.id;
      let tasks = getTasks();
      const t = tasks.find(x => x.id === id);
      if (!t) return;
  
      if (e.target.checked) {
        // mark completed
        t.completed = true;
        t.completedDate = todayKey();
  
        // move to archive
        archiveTask(t);
  
        // remove from active list
        tasks = tasks.filter(x => x.id !== id);
        saveTasks(tasks);
      } else {
        // rare case: someone unchecks from archive restore view  
        t.completed = false;
        saveTasks(tasks);
      }
  
      // update UI
      renderMatrixTasks();
      updateDashboardStats();
      renderDashboardCharts();
});
  });

  list.querySelectorAll('.edit-task').forEach(btn => btn.addEventListener('click', () => openTodoModal(btn.dataset.id)));
  list.querySelectorAll('.del-task').forEach(btn => {
    btn.addEventListener('click', () => {
      saveTasks(getTasks().filter(t => t.id !== btn.dataset.id));
      renderTaskList(filter);
      updateDashboardStats();
    });
  });
}


function openTodoModal(editId = null) {
  const name = document.getElementById('taskName');
  const due = document.getElementById('taskDueDate');
  // block past dates
  const today = new Date().toISOString().split("T")[0];
  due.min = today;
  const time = document.getElementById('taskTime');
  const type = document.getElementById('taskMatrixType');

  name.value = '';
  due.value = '';
  time.value = '';
  type.value = 'q1';

  delete saveTaskBtn.dataset.editId;

  if (editId) {
    const t = getTasks().find(x => x.id === editId);
    if (t) {
      name.value = t.name;
      due.value = t.dueDate || '';
      time.value = t.focusTime || 0;
      type.value = t.matrixType || 'q1';

      saveTaskBtn.dataset.editId = editId;
    }
  }
}


function renderMatrixTasks() {
  const searchTerm = document.getElementById('todoSearch')?.value.toLowerCase() || '';
  const activeFilter = document.querySelector('.todo-filter.active')?.dataset.filter || 'all';

  let tasks = getTasks().filter(t => !t.completed);

  // Apply search filter
  if (searchTerm) {
    tasks = tasks.filter(t => t.name.toLowerCase().includes(searchTerm));
  }

  // Apply date filters
  const today = todayKey();
  if (activeFilter === 'today') {
    tasks = tasks.filter(t => t.dueDate === today);
  } else if (activeFilter === 'overdue') {
    tasks = tasks.filter(t => t.dueDate && t.dueDate < today);
  }

  const groups = { q1: [], q2: [], q3: [], q4: [] };

  tasks.forEach(t => {
    const type = t.matrixType || "q1";
    groups[type].push(t);
  });

  // Sort tasks inside each quadrant
  Object.keys(groups).forEach(q => {
    groups[q].sort((a, b) => {

      const ad = a.dueDate || "";
      const bd = b.dueDate || "";

      const aExpired = ad && ad < today;
      const bExpired = bd && bd < today;

      // 1) No due date → go to top
      if (!ad && bd) return -1;
      if (!bd && ad) return 1;
      if (!ad && !bd) return 0;

      // 2) One expired → push expired to bottom
      if (!aExpired && bExpired) return -1;
      if (!bExpired && aExpired) return 1;

      // 3) Both upcoming OR both expired → sort by date ascending
      return ad.localeCompare(bd);
    });
  });

  

  const quadrants = {
    q1: document.getElementById("q1-list"),
    q2: document.getElementById("q2-list"),
    q3: document.getElementById("q3-list"),
    q4: document.getElementById("q4-list")
  };

  Object.values(quadrants).forEach(q => q.innerHTML = "");

  // Render tasks
  Object.keys(groups).forEach(q => {
    const list = quadrants[q];

    if (!groups[q].length) {
      list.innerHTML = "<p class='empty-matrix'>No tasks</p>";
      return;
    }

    groups[q].forEach(t => {
      const div = document.createElement("div");
      div.className = `matrix-task ${t.completed ? "done" : ""}`;      
      div.dataset.id = t.id;
      div.draggable = true;

      // ✔ Format date → "21 Nov"
      let dateFormatted = "";
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        dateFormatted = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short"
        });
      }

      div.innerHTML = `
        <div class="matrix-task-top">
          <input type="checkbox" data-id="${t.id}" ${t.completed ? "checked" : ""}>
          <span class="task-name">${t.name}</span>
        </div>

        <div class="matrix-meta">
          <div class="matrix-meta-left">
          ${t.dueDate ? `
            <span class="${(!t.completed && t.dueDate < todayKey()) ? 'expired-date' : ''}">
              🗓 ${dateFormatted}
            </span>
          ` : ""}
          
            ${t.focusTime ? `<span>⏱ ${t.focusTime} min</span>` : ""}
          </div>

          <div class="matrix-meta-right">
            <button class="edit-task" data-id="${t.id}">Edit</button>
            <button class="del-task" data-id="${t.id}">Delete</button>
          </div>
        </div>
      `;

      /* --- DRAG START --- */
      div.addEventListener("dragstart", e => {
        e.dataTransfer.setData("taskId", t.id);
      });

      list.appendChild(div);
    });
  });

  // --- Drop handlers ---
  ["q1", "q2", "q3", "q4"].forEach(q => {
    const box = document.querySelector(`.matrix-box[data-type="${q}"]`);

    box.addEventListener("dragover", e => {
      e.preventDefault();
      box.classList.add("drag-hover");
    });

    box.addEventListener("dragleave", () => {
      box.classList.remove("drag-hover");
    });

    box.addEventListener("drop", e => {
      box.classList.remove("drag-hover");
      const id = e.dataTransfer.getData("taskId");

      const tasks = getTasks();
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      task.matrixType = q;
      saveTasks(tasks);
      renderMatrixTasks();
    });
  });

document.querySelectorAll('.matrix-task input[type="checkbox"]').forEach(cb => {
  cb.addEventListener("change", async e => {

    const id = e.target.dataset.id;
    const row = e.target.closest(".matrix-task");
    const nameEl = row.querySelector(".task-name");

    if (e.target.checked) {

      nameEl.classList.add("task-strike");
      setTimeout(() => nameEl.classList.add("striked"), 30);

      setTimeout(() => {
        row.style.transition = "opacity .3s ease";
        row.style.opacity = "0";
      }, 200);

      setTimeout(async () => {

        await completeTask(id);          
        await renderMatrixTasks();       
        updateDashboardStats();         
        renderDashboardCharts();        

      }, 500);

    } else {
      await renderMatrixTasks();
      updateDashboardStats();
      renderDashboardCharts();
    }

  });
});

// Edit
document.querySelectorAll('.edit-task').forEach(btn => {
  btn.addEventListener("click", () => openTodoModal(btn.dataset.id));
});

// Delete
document.querySelectorAll('.del-task').forEach(btn => {
  btn.addEventListener("click", async () => {
    await deleteTask(btn.dataset.id);     //  backend
    await renderMatrixTasks();            // reload


  })
  // Edit
  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener("click", () => openTodoModal(btn.dataset.id));
  });
});

}

function renderRemindersPage() {
  mainContent.innerHTML = `
    <div class="reminders-page">
      <div class="reminders-header">
        <h1>Reminders</h1>
        <button id="newReminderBtn" class="matrix-add-btn">＋ New Reminder</button>
      </div>

      <ul id="reminderList" class="reminder-list"></ul>
    </div>
  `;

  document.getElementById("newReminderBtn").addEventListener("click", () => {
    openReminderModal();
  });

  renderReminderList();
}


function renderReminderList() {
  const list = document.getElementById('reminderList');
  if (!list) return;

  const reminders = getReminders().sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  list.innerHTML = reminders.length === 0
    ? `<li style="color:#A6ADBA;padding:12px">No reminders.</li>`
    : '';

  reminders.forEach(r => {
    const dateObj = new Date(r.datetime);
    const li = document.createElement('li');
    li.className = 'reminder-item';
    li.innerHTML = `
      <div class="reminder-info">
        <p><strong>${escapeHtml(r.title)}</strong></p>
        <p class="reminder-time">${dateObj.toLocaleString()}</p>
      </div>
      <div class="habit-actions">
        <button class="icon-btn edit-rem" data-id="${r.id}">Edit</button>
        <button class="icon-btn del-rem" data-id="${r.id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.edit-rem').forEach(btn => btn.addEventListener('click', () => openReminderModal(btn.dataset.id)));
  list.querySelectorAll('.del-rem').forEach(btn => {
    btn.addEventListener('click', () => {
      saveReminders(getReminders().filter(x => x.id !== btn.dataset.id));
      renderReminderList();
      updateDashboardStats();
    });
  });
  
}
function renderArchivePage() {
  mainContent.innerHTML = `
    <div class="archive-page">
      <h1>Archived Tasks</h1>
      <div id="archiveList" class="archive-list"></div>
    </div>
  `;

  renderArchiveList();
}
function renderArchiveList() {
  const list = document.getElementById("archiveList");
  const archive = getArchive();

  if (!list) return;

  if (archive.length === 0) {
    list.innerHTML = `<p class="empty-archive">No archived tasks.</p>`;
    return;
  }

  list.innerHTML = archive.map(t => `
    <div class="archive-item" data-id="${t.id}">
      <div class="archive-info">
        <h3>${t.name}</h3>
        ${t.dueDate ? `<p>📅 ${t.dueDate}</p>` : ""}
        ${t.focusTime ? `<p>⏱ ${t.focusTime} min</p>` : ""}
        <p class="archived-on">Archived: ${t.archivedAt}</p>
      </div>

      <div class="archive-actions">
        <button class="archive-btn restore-btn" data-id="${t.id}">Restore</button>
        <button class="archive-btn delete-btn" data-id="${t.id}">Delete</button>
      </div>
    </div>
  `).join("");

  // DELETE handler
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const item = btn.closest(".archive-item");
  
      // add animation class
      item.classList.add("disappear");
  
      // after animation ends → remove & refresh
      setTimeout(() => {
        saveArchive(archive.filter(t => t.id !== id));
        renderArchiveList();
      }, 350);
    };
  });
  

  // RESTORE handler
// RESTORE handler
document.querySelectorAll(".restore-btn").forEach(btn => {
  btn.onclick = () => {
    const id = btn.dataset.id;
    const item = btn.closest(".archive-item");

    // find the archived task
    const archive = getArchive();
    const task = archive.find(x => x.id === id);
    if (!task) return;

    // animation
    item.classList.add("disappear");

    setTimeout(() => {
      // remove from archive
      saveArchive(archive.filter(x => x.id !== id));

      // restore in tasks list
      let tasks = getTasks();
      let existing = tasks.find(x => x.id === id);

      if (existing) {
        // the task already exists → update it
        existing.completed = false;
        delete existing.completedDate;
      } else {
        // if it isn't there → push a clean copy
        tasks.push({
          ...task,
          completed: false
        });
      }

      saveTasks(tasks);

      renderArchiveList();
      renderMatrixTasks();
      updateDashboardStats();
      renderDashboardCharts();

    }, 300);
  };
});
}

function cleanArchive() {
  const archive = getArchive();
  const now = new Date(todayKey());

  const filtered = archive.filter(t => {
    const archived = new Date(t.archivedAt);
    return (now - archived) / 86400000 < 7;
  });

  saveArchive(filtered);
}
cleanArchive();


function openReminderModal(editId = null) {
  const modal = document.getElementById('reminderModal');
  const title = document.getElementById('reminderTitle');
  const date = document.getElementById('reminderDate');
  const time = document.getElementById('reminderTime');

  modal.classList.remove('hidden');
  title.value = '';
  date.value = '';
  time.value = '';
  delete saveReminderBtn.dataset.editId;

  // ---- EDIT MODE ----
  if (editId) {
    const r = getReminders().find(x => x.id === editId);
    if (r) {
      const dt = new Date(r.datetime);
      title.value = r.title;
      date.value = dt.toISOString().split('T')[0];
      time.value = dt.toTimeString().slice(0, 5);
      saveReminderBtn.dataset.editId = editId;
    }
  }

  // ---- RESET OLD EVENT LISTENERS ----
  const newSaveBtn = saveReminderBtn.cloneNode(true);
  saveReminderBtn.parentNode.replaceChild(newSaveBtn, saveReminderBtn);
  saveReminderBtn = newSaveBtn;

  // ---- SAVE HANDLER ----
  saveReminderBtn.addEventListener('click', () => {
    const t = title.value.trim();
    const d = date.value;
    const tm = time.value;
    if (!t || !d || !tm) return alert("Fill all fields");

    const datetime = new Date(`${d}T${tm}`);
    if (isNaN(datetime)) return alert("Invalid date/time");

    let reminders = getReminders();

    if (saveReminderBtn.dataset.editId) {
      // EDIT REMINDER
      const idx = reminders.findIndex(x => x.id === saveReminderBtn.dataset.editId);
      if (idx >= 0) {
        reminders[idx] = {
          ...reminders[idx],
          title: t,
          datetime: datetime.toISOString(),    // FIXED
        };
      }
    } else {
      // NEW REMINDER
      reminders.push({
        id: String(Date.now()),
        title: t,
        datetime: datetime.toISOString(),      // FIXED
      });
    }

    saveReminders(reminders);
    modal.classList.add("hidden");
    renderReminderList();
    updateDashboardStats();
  });
}

// ================= CALENDAR (Dashboard) =================
function generateHabitCalendar() {
  const cal = document.getElementById('habitCalendar');
  if (!cal) return;
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const days = new Date(year, month + 1, 0).getDate();

  cal.innerHTML = '';
  for (let d = 1; d <= days; d++) {
    const div = document.createElement('div');
    div.className = 'calendar-day';
    div.textContent = d;
    if (d === today.getDate()) div.classList.add('today');
    cal.appendChild(div);
  }
}
// ====== Load user info on dashboard ======
window.addEventListener('DOMContentLoaded', () => {
  const email = localStorage.getItem('userEmail');
  const name = localStorage.getItem('userName');

  if (email && name) {
    const nameEl = document.querySelector('.profile-info .para:nth-child(1)');
    const emailEl = document.querySelector('.profile-info .para:nth-child(2)');

    if (nameEl) nameEl.textContent = `@${name}`;
    if (emailEl) emailEl.textContent = email;
  } else {
    // If user not signed up or info missing
    console.warn('No user info found in localStorage.');
  }
});

// ===== LOGOUT BUTTON =====
const logoutBtn = document.querySelector('.logo-logout');

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('activeSection');

    // (optional) Clear everything if you want full reset:
    // localStorage.clear();

    window.location.href = "login.html"; // redirect
  });
}

function tinyConfetti(x, y) {
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("div");
    p.className = "tiny-confetti";

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;

    p.style.setProperty("--dx", Math.cos(angle) * speed + "px");
    p.style.setProperty("--dy", Math.sin(angle) * speed + "px");

    p.style.left = x + "px";
    p.style.top = y + "px";

    document.body.appendChild(p);

    setTimeout(() => p.remove(), 600);
  }
}

// ==== Apple-style small date ====
const dateDisplay = document.getElementById("dateDisplay");
const d = new Date();
const formattedDate = d.toLocaleDateString("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric"
});
if (dateDisplay) dateDisplay.textContent = formattedDate;

// ==== Apple-style greeting ====
function appleGreeting(name) {
  const hr = new Date().getHours();
  if (hr < 12) return `Good morning, <span>${name}</span> ☀️`;
  if (hr < 18) return `Good afternoon, <span>${name}</span> 🌤️`;
  return `Good evening, <span>${name}</span> 🌙`;
}

const nm = localStorage.getItem("username");
if (nm) {
  const greetEl = document.getElementById("greeting");
  if (greetEl) greetEl.innerHTML = appleGreeting(nm);
}
