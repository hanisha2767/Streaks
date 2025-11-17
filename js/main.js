// ===== Date Utility =====
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

function getTasks() { return JSON.parse(localStorage.getItem('tasks') || '[]'); }
function saveTasks(t) { localStorage.setItem('tasks', JSON.stringify(t)); }

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
            </div>
          </section>`;
        renderDashboard();
      } else if (section === 'habits') renderHabitsCard();
      else if (section === 'todo') renderTodoPage();
      else if (section === 'reminders') renderRemindersPage();
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
      const editId = saveHabitBtn.dataset.editId;

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

  // Save task
  document.addEventListener('click', e => {
    if (e.target && e.target.id === 'saveTask') {
      const name = document.getElementById('taskName').value.trim();
      const due = document.getElementById('taskDueDate').value;
      const priority = document.getElementById('taskPriority').value;
      const time = Number(document.getElementById('taskTime').value) || 0;
      if (!name) return alert('Enter a task name');

      const tasks = getTasks();
      const editId = saveTaskBtn.dataset.editId;
      if (editId) {
        const t = tasks.find(t => t.id === editId);
        if (t) Object.assign(t, { name, dueDate: due, priority, focusTime: time });
      } else {
        tasks.push({ id: String(Date.now()), name, dueDate: due, priority, focusTime: time, completed: false });
      }
      saveTasks(tasks);
      todoModal.classList.add('hidden');
      renderTaskList('all');
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


// ===== Dashboard =====
function renderDashboard() {
  ensureTaskDates();
  updateDashboardStats();
  renderDashboardCharts();
  generateHabitCalendar();

  const t = new Date();
  const dateEl = document.querySelector('.date');
  if (dateEl)
    dateEl.innerHTML = `<span class="date-num">${String(t.getDate()).padStart(2, '0')}</span> ${t.toLocaleString('default',{month:'short'})} ${t.getFullYear()}`;
}

function renderDashboardCharts() {
  [window.focusWeekChart, window.habitsPie].forEach(ch => ch?.destroy?.());

  const weekCtx = document.getElementById('focusWeekChart');
  if (weekCtx) {
    const weekData = getWeekFocusData();
    window.focusWeekChart = new Chart(weekCtx, {
      type: 'line',
      data: { labels: weekData.labels, datasets: [{ data: weekData.hours, borderColor: '#05c26a', backgroundColor: 'rgba(5,194,106,0.08)', tension: 0.4, fill: true }] },
      options: { plugins: { legend: { display: false } }, maintainAspectRatio: false }
    });
  }

  const pieCtx = document.getElementById('habitsPie');
  if (pieCtx) {
    const { completed, pending } = getHabitsPieData();
    window.habitsPie = new Chart(pieCtx, {
      type: 'pie',
      data: { labels: ['Completed', 'Pending'], datasets: [{ data: [completed, pending], backgroundColor: ['#05c26a', '#ffca28'] }] },
      options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
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
    const mins = tasks.filter(t => t.completedDate === key).reduce((s, t) => s + (Number(t.focusTime) || 0), 0);
    labels.push(`${d.getDate()} ${d.toLocaleString('default',{month:'short'})}`);
    hours.push((mins / 60).toFixed(1));
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

  document.getElementById('todo-count')?.replaceChildren(tasks.length);

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

  list.innerHTML = '';
  if (todays.length === 0) {
    list.innerHTML = `<li style="color:#A6ADBA;padding:12px">No habits today. Add one!</li>`;
    return;
  }

  todays.forEach(h => {
    const li = document.createElement('li');
    li.className = 'habit-item';
    const checked = progress[h.id] ? 'checked' : '';
    const doneClass = progress[h.id] ? 'done' : '';
    li.innerHTML = `
      <input type="checkbox" class="habit-checkbox" data-id="${h.id}" ${checked}>
      <div class="habit-text ${doneClass}">${escapeHtml(h.name)}</div>
      <div class="habit-actions">
        <button class="icon-btn edit" data-id="${h.id}">Edit</button>
        <button class="icon-btn del" data-id="${h.id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.habit-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = e.target.dataset.id;
      const prog = getDailyProgress(todayKey());
      prog[id] = e.target.checked;
      saveDailyProgress(todayKey(), prog);
      renderTodaysList();
      updateDashboardStats();
      renderDashboardCharts();
    });
  });

  list.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', () => openHabitModal(btn.dataset.id)));
  list.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', () => {
      let habits = getHabits().filter(h => h.id !== btn.dataset.id);
      saveHabits(habits);
      const prog = getDailyProgress(todayKey());
      delete prog[btn.dataset.id];
      saveDailyProgress(todayKey(), prog);
      renderTodaysList();
      updateDashboardStats();
    });
  });
}

function openHabitModal(editId = null) {
  modal.classList.remove('hidden');
  document.getElementById('modalTitle').textContent = editId ? 'Edit Habit' : 'Add Habit';
  habitNameIn.value = '';
  document.querySelectorAll('input[name="freq"]').forEach(r => r.checked = false);
  document.querySelector('input[name="freq"][value="daily"]').checked = true;
  customDaysWrap.classList.add('hidden');
  customDaysWrap.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  delete saveHabitBtn.dataset.editId;

  if (editId) {
    const h = getHabits().find(x => x.id === editId);
    if (h) {
      habitNameIn.value = h.name;
      const freqEl = document.querySelector(`input[name="freq"][value="${h.freq}"]`);
      if (freqEl) freqEl.checked = true;
      if (h.freq === 'custom') {
        customDaysWrap.classList.remove('hidden');
        customDaysWrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = h.days?.includes(Number(cb.dataset.day));
        });
      }
      saveHabitBtn.dataset.editId = editId;
    }
  }
}

// ================= TODO PAGE =================
function renderTodoPage() {
  mainContent.innerHTML = `
    <div class="habits-card todo-card">
      <div class="card-header">
        <h3>To-Do List</h3>
        <div>
          <button id="addTaskBtn" class="icon-btn">＋</button>
          <button id="filterAll" class="icon-btn active-filter">All</button>
          <button id="filterPending" class="icon-btn">Pending</button>
          <button id="filterDone" class="icon-btn">Done</button>
        </div>
      </div>
      <ul id="taskList" class="habit-list"></ul>
      <div class="card-controls">
        <div></div>
        <button id="refreshTasks" class="btn ghost">Refresh</button>
      </div>
    </div>
  `;

  document.getElementById('addTaskBtn').addEventListener('click', () => openTodoModal());
  document.getElementById('refreshTasks').addEventListener('click', () => renderTaskList('all'));

  document.getElementById('filterAll').addEventListener('click', e => { setActiveFilter(e.target); renderTaskList('all'); });
  document.getElementById('filterPending').addEventListener('click', e => { setActiveFilter(e.target); renderTaskList('pending'); });
  document.getElementById('filterDone').addEventListener('click', e => { setActiveFilter(e.target); renderTaskList('done'); });

  renderTaskList('all');
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
        <span class="priority ${task.priority?.toLowerCase()}">${task.priority}</span>
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
cb.addEventListener('change', e => {
  const id = e.target.dataset.id;
  const tasks = getTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = e.target.checked;
  task.completedDate = e.target.checked ? todayKey() : null; // ← MUST SET THIS

  saveTasks(tasks);
  renderTaskList(filter);
  updateDashboardStats();     // ← updates focus hours
  renderDashboardCharts();    // ← updates weekly chart
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
  todoModal.classList.remove('hidden');
  document.getElementById('todoModalTitle').textContent = editId ? 'Edit Task' : 'Add Task';

  const name = document.getElementById('taskName');
  const due = document.getElementById('taskDueDate');
  const pri = document.getElementById('taskPriority');
  const time = document.getElementById('taskTime');

  name.value = ''; due.value = ''; pri.value = 'Medium'; time.value = '';
  delete saveTaskBtn.dataset.editId;

  if (editId) {
    const t = getTasks().find(x => x.id === editId);
    if (t) {
      name.value = t.name;
      due.value = t.dueDate || '';
      pri.value = t.priority || 'Medium';
      time.value = t.focusTime || '';
      saveTaskBtn.dataset.editId = editId;
    }
  }
}

// ================= REMINDERS PAGE =================
function renderRemindersPage() {
  mainContent.innerHTML = `
    <div class="reminder-card">
      <div class="card-header">
        <h3>Reminders</h3>
        <button id="addReminderBtn" class="icon-btn">＋</button>
      </div>
      <ul id="reminderList" class="habit-list"></ul>
    </div>
  `;
  document.getElementById('addReminderBtn').addEventListener('click', () => openReminderModal());
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

function openReminderModal(editId = null) {
  const modal = document.getElementById('reminderModal');
  const title = document.getElementById('reminderTitle');
  const date = document.getElementById('reminderDate');
  const time = document.getElementById('reminderTime');

  modal.classList.remove('hidden');
  title.value = ''; date.value = ''; time.value = '';
  delete saveReminderBtn.dataset.editId;

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

  const saveHandler = () => {
    const t = title.value.trim();
    const d = date.value;
    const tm = time.value;
    if (!t || !d || !tm) return alert('Fill all fields');
    const datetime = new Date(`${d}T${tm}`);
    if (isNaN(datetime)) return alert('Invalid date/time');

    let reminders = getReminders();
    if (saveReminderBtn.dataset.editId) {
      const idx = reminders.findIndex(x => x.id === saveReminderBtn.dataset.editId);
      if (idx >= 0) reminders[idx] = { ...reminders[idx], title: t, datetime };
    } else {
      reminders.push({ id: String(Date.now()), title: t, datetime });
    }
    saveReminders(reminders);
    modal.classList.add('hidden');
    renderReminderList();
    updateDashboardStats();
    saveReminderBtn.removeEventListener('click', saveHandler);
  };
  saveReminderBtn.addEventListener('click', saveHandler);
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
