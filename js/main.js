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
function getArchive() { 
  return JSON.parse(localStorage.getItem('archive') || '[]'); 
}
function saveArchive(a) { 
  localStorage.setItem('archive', JSON.stringify(a)); 
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
      if (editId) {
        const t = tasks.find(t => t.id === editId);
        if (t) {
            t.name = name;
            t.dueDate = due;
            t.focusTime = time;
            t.matrixType = matrixType;
        }
    } else {
        tasks.push({
            id: String(Date.now()),
            name,
            dueDate: due,
            focusTime: time,
            matrixType,
            completed: false
        });
    }
    

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
      // prevent past date on save
      if (due && due < todayKey()) {
        return alert("You cannot select a past date.");
      }
      const time = Number(document.getElementById('taskTime').value) || 0;
      const matrixType = document.getElementById('taskMatrixType').value;
  
      if (!name) return alert('Enter a task name');
  
      const tasks = getTasks();
      const editId = saveTaskBtn.dataset.editId;
  
      if (editId) {
        const t = tasks.find(t => t.id === editId);
        if (t) {
          t.name = name;
          t.dueDate = due;
          t.focusTime = time;
          t.matrixType = matrixType;
        }
      } else {
        tasks.push({
          id: String(Date.now()),
          name,
          dueDate: due,
          focusTime: time,
          matrixType,
          completed: false
        });
      }
  
      saveTasks(tasks);
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
    <div class="matrix-page">

      <div class="matrix-header">
        <h1>To do list</h1>
        <button id="newTaskMatrix" class="matrix-add-btn">＋ New Task</button>
      </div>

      <div class="matrix-grid">

        <div class="matrix-box q1" data-type="q1">
          <h2>Urgent + Important</h2>
          <p class="q-desc">Do First</p>
          <div class="matrix-list" id="q1-list"></div>
        </div>

        <div class="matrix-box q2" data-type="q2">
          <h2>Not Urgent + Important</h2>
          <p class="q-desc">Schedule</p>
          <div class="matrix-list" id="q2-list"></div>
        </div>

        <div class="matrix-box q3" data-type="q3">
          <h2>Urgent + Not Important</h2>
          <p class="q-desc">Delegate</p>
          <div class="matrix-list" id="q3-list"></div>
        </div>

        <div class="matrix-box q4" data-type="q4">
          <h2>Not Urgent + Not Important</h2>
          <p class="q-desc">Eliminate</p>
          <div class="matrix-list" id="q4-list"></div>
        </div>

      </div>
    </div>
  `;

  document.getElementById("newTaskMatrix").addEventListener("click", () => openTodoModal());
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
    .forEach(btn => btn.addEventListener('click', () => {
      saveTasks(getTasks().filter(t => t.id !== btn.dataset.id));
      renderTaskGrid(filter);
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
  todoModal.classList.remove('hidden');

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
  const tasks = getTasks();

  const groups = { q1: [], q2: [], q3: [], q4: [] };
  tasks.forEach(t => {
    const type = t.matrixType || "q1";
    groups[type].push(t);
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

  // Checkbox toggle
  // Checkbox toggle (ARCHIVE READY)
// Checkbox toggle — DO NOT ARCHIVE ANYMORE
// Checkbox toggle — strike → fade → hide BUT not archive
// Checkbox toggle — strike → fade → archive
document.querySelectorAll('.matrix-task input[type="checkbox"]').forEach(cb => {
  cb.addEventListener("change", e => {
    const id = e.target.dataset.id;
    let tasks = getTasks();
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    const row = e.target.closest(".matrix-task");
    const nameEl = row.querySelector(".task-name");

    if (e.target.checked) {

      // 1) STRIKE animation
      nameEl.classList.add("task-strike");
      setTimeout(() => nameEl.classList.add("striked"), 50);

      // 2) FADE OUT
      setTimeout(() => {
        row.style.transition = "opacity 0.3s ease";
        row.style.opacity = "0";
      }, 250);

      // 3) AFTER FADE → ARCHIVE
      setTimeout(() => {
        // mark completed
        t.completed = true;
        t.completedDate = todayKey();

        // move to archive
        archiveTask(t);

        // remove from active list
        const newList = tasks.filter(x => x.id !== id);
        saveTasks(newList);

        // re-render
        renderMatrixTasks();
        updateDashboardStats();
        renderDashboardCharts();

      }, 600);
    } else {
      // unchecking (rare)
      t.completed = false;
      delete t.completedDate;
      saveTasks(tasks);
    }

  });
});



  // Edit
  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener("click", () => openTodoModal(btn.dataset.id));
  });

  // Delete
  document.querySelectorAll('.del-task').forEach(btn => {
    btn.addEventListener("click", () => {
      saveTasks(getTasks().filter(t => t.id !== btn.dataset.id));
      renderMatrixTasks();
    });
  });
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
  document.querySelectorAll(".restore-btn").forEach(btn => {
  btn.onclick = () => {
    const id = btn.dataset.id;
    const item = btn.closest(".archive-item");
    const task = archive.find(x => x.id === id);

    // apply animation
    item.classList.add("disappear");

    setTimeout(() => {
      // remove from archive
      saveArchive(archive.filter(x => x.id !== id));

      // restore to tasks
      const tasks = getTasks();
      task.completed = false;
      delete task.completedDate;
      tasks.push(task);
      saveTasks(tasks);

      renderArchiveList();
      renderMatrixTasks();
    }, 350);
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