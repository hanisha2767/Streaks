let currentUser = null;
let currentChart = null;
let habitChartInstance = null;
let allHabits = [];
let allTasks = [];
let allReminders = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = '/Streaks/login.html';
    return;
  }

  currentUser = user;
  await initializeApp();
  setupEventListeners();
});

async function initializeApp() {
  updateDate();
  await loadUserProfile();
  await loadData();
  renderDashboard();
}

function updateDate() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', options);

  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12) greeting = 'Good afternoon';
  if (hour >= 18) greeting = 'Good evening';

  document.getElementById('greeting').textContent = greeting + '! 👋';
}

async function loadUserProfile() {
  try {
    const profile = await getUserProfile();
    if (profile) {
      document.getElementById('topName').textContent = '@' + (profile.username || 'user');
      document.querySelector('.profile-info .para:nth-child(2)').textContent = profile.email;
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function loadData() {
  try {
    const [habitsData, tasksData, remindersData] = await Promise.all([
      supabase
        .from('habits')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('due_date', { ascending: true }),
      supabase
        .from('reminders')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('completed', false)
        .order('reminder_date', { ascending: true }),
    ]);

    allHabits = habitsData.data || [];
    allTasks = tasksData.data || [];
    allReminders = remindersData.data || [];
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function renderDashboard() {
  const todayTasks = allTasks.filter((t) => !t.completed && new Date(t.due_date) <= new Date());
  const totalFocusHours = allTasks.reduce((sum, t) => sum + (t.focus_time || 0), 0) / 60;

  document.getElementById('todo-count').textContent = todayTasks.length;
  document.getElementById('focus-hours').textContent = Math.round(totalFocusHours * 10) / 10;

  const completedHabits = allHabits.length > 0 ? Math.floor(allHabits.length / 2) : 0;
  document.getElementById('habits-completed').textContent = completedHabits;
  document.getElementById('habits-total').textContent = allHabits.length;

  document.getElementById('reminders-upcoming').textContent = allReminders.length;

  renderFocusChart();
  renderHabitsChart();
  renderRemindersList();
}

function renderFocusChart() {
  const ctx = document.getElementById('focusWeekChart');
  if (!ctx) return;

  const today = new Date();
  const weekData = [];
  const labels = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayFocus = allTasks
      .filter((t) => t.due_date === dateStr)
      .reduce((sum, t) => sum + (t.focus_time || 0), 0);

    weekData.push(dayFocus);
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  if (currentChart) {
    currentChart.destroy();
  }

  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Focus Time (minutes)',
          data: weekData,
          backgroundColor: '#05c26a',
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#E6E8EC',
          },
          grid: {
            color: '#434a59',
          },
        },
        x: {
          ticks: {
            color: '#E6E8EC',
          },
          grid: {
            color: '#434a59',
          },
        },
      },
    },
  });
}

function renderHabitsChart() {
  const ctx = document.getElementById('habitsPie');
  if (!ctx) return;

  const completed = Math.floor(allHabits.length / 2);
  const remaining = allHabits.length - completed;

  if (habitChartInstance) {
    habitChartInstance.destroy();
  }

  habitChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Remaining'],
      datasets: [
        {
          data: [completed, remaining],
          backgroundColor: ['#05c26a', '#434a59'],
          borderColor: '#2a303c',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: '#E6E8EC',
          },
        },
      },
    },
  });
}

function renderRemindersList() {
  const list = document.getElementById('dashboardReminderList');
  if (!list) return;

  list.innerHTML = '';
  allReminders.slice(0, 5).forEach((reminder) => {
    const li = document.createElement('li');
    li.textContent = reminder.title;
    list.appendChild(li);
  });
}

function setupEventListeners() {
  document.querySelectorAll('.nav-bar-icons').forEach((icon) => {
    icon.addEventListener('click', () => {
      document.querySelectorAll('.nav-bar-icons').forEach((i) => i.classList.remove('active'));
      icon.classList.add('active');

      const section = icon.dataset.section;
      showSection(section);
    });
  });

  document.querySelector('.logout-wrapper').addEventListener('click', async () => {
    await logout();
    window.location.href = '/Streaks/login.html';
  });

  setupTaskModal();
  setupHabitModal();
  setupReminderModal();
}

function showSection(section) {
  const mainContent = document.getElementById('main-content');

  if (section === 'dashboard') {
    mainContent.innerHTML = `
      <section id="dashboard-section">
        <div class="date-div">
          <p class="date-sub" id="dateDisplay"></p>
          <p class="greet-apple" id="greeting"></p>
          <div class="middle-part">
            <div class="box-1">
              <p class="title-middle">Daily Summary</p>
              <p class="middle-p">To do tasks: <span id="todo-count">0</span></p>
              <p class="middle-p">Focus Hours: <span id="focus-hours">0</span> hrs</p>
            </div>
            <div class="box-1">
              <p class="title-middle">Habits</p>
              <p class="middle-p"><span id="habits-completed">0</span>/<span id="habits-total">0</span> completed</p>
            </div>
            <div class="box-1">
              <p class="title-middle">Reminders</p>
              <p class="middle-p">Upcoming: <span id="reminders-upcoming">0</span></p>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-container">
            <p class="title-middle">Focus Hours (This Week)</p>
            <canvas id="focusWeekChart"></canvas>
          </div>

          <div class="chart-container">
            <p class="title-middle">Habits Overview</p>
            <canvas id="habitsPie"></canvas>
          </div>

          <div class="chart-container reminders-mini">
            <p class="title-middle">Reminders</p>
            <ul id="dashboardReminderList" class="reminder-mini-list"></ul>
          </div>
        </div>
      </section>
    `;
    updateDate();
    renderDashboard();
  } else if (section === 'habits') {
    renderHabitsSection();
  } else if (section === 'todo') {
    renderTodoSection();
  } else if (section === 'reminders') {
    renderRemindersSection();
  } else if (section === 'archive') {
    renderArchiveSection();
  }
}

function renderHabitsSection() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <section>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <h2 style="color: #E6E8EC;">Habits</h2>
        <button class="btn" onclick="openHabitModal()">+ Add Habit</button>
      </div>
      <div id="habitsList"></div>
    </section>
  `;

  renderHabitsList();
}

function renderHabitsList() {
  const habitsList = document.getElementById('habitsList');
  if (!habitsList) return;

  habitsList.innerHTML = '';
  allHabits.forEach((habit) => {
    const habitEl = document.createElement('div');
    habitEl.style.cssText =
      'background: #3a4150; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
    habitEl.innerHTML = `
      <div>
        <p style="color: #E6E8EC; margin: 0; font-weight: 500;">${habit.name}</p>
        <p style="color: #999; margin: 5px 0 0 0; font-size: 14px;">${habit.frequency}</p>
      </div>
      <div>
        <button style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 18px;" onclick="deleteHabit('${habit.id}')">×</button>
      </div>
    `;
    habitsList.appendChild(habitEl);
  });
}

function renderTodoSection() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <section>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <h2 style="color: #E6E8EC;">To-Do List</h2>
        <button class="btn" onclick="openTaskModal()">+ Add Task</button>
      </div>
      <div id="tasksList"></div>
    </section>
  `;

  renderTasksList();
}

function renderTasksList() {
  const tasksList = document.getElementById('tasksList');
  if (!tasksList) return;

  tasksList.innerHTML = '';
  const categories = { q1: 'Urgent + Important', q2: 'Not Urgent + Important', q3: 'Urgent + Not Important', q4: 'Not Urgent + Not Important' };

  allTasks.forEach((task) => {
    const taskEl = document.createElement('div');
    taskEl.style.cssText =
      'background: #3a4150; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
    taskEl.innerHTML = `
      <div style="flex: 1;">
        <p style="color: #E6E8EC; margin: 0; font-weight: 500; ${task.completed ? 'text-decoration: line-through;' : ''}">${task.name}</p>
        <p style="color: #999; margin: 5px 0 0 0; font-size: 14px;">${categories[task.category]} • ${task.focus_time} mins</p>
      </div>
      <div>
        <button style="background: none; border: none; color: #05c26a; cursor: pointer; margin-right: 10px;" onclick="toggleTask('${task.id}', ${!task.completed})">✓</button>
        <button style="background: none; border: none; color: #ff6b6b; cursor: pointer;" onclick="deleteTask('${task.id}')">×</button>
      </div>
    `;
    tasksList.appendChild(taskEl);
  });
}

function renderRemindersSection() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <section>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <h2 style="color: #E6E8EC;">Reminders</h2>
        <button class="btn" onclick="openReminderModal()">+ Add Reminder</button>
      </div>
      <div id="remindersList"></div>
    </section>
  `;

  renderRemindersList2();
}

function renderRemindersList2() {
  const remindersList = document.getElementById('remindersList');
  if (!remindersList) return;

  remindersList.innerHTML = '';
  allReminders.forEach((reminder) => {
    const reminderEl = document.createElement('div');
    reminderEl.style.cssText =
      'background: #3a4150; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
    reminderEl.innerHTML = `
      <div>
        <p style="color: #E6E8EC; margin: 0; font-weight: 500;">${reminder.title}</p>
        <p style="color: #999; margin: 5px 0 0 0; font-size: 14px;">${reminder.reminder_date} at ${reminder.reminder_time}</p>
      </div>
      <div>
        <button style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 18px;" onclick="deleteReminder('${reminder.id}')">×</button>
      </div>
    `;
    remindersList.appendChild(reminderEl);
  });
}

function renderArchiveSection() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <section>
      <h2 style="color: #E6E8EC;">Archive</h2>
      <div id="archiveList"></div>
    </section>
  `;

  renderArchiveList();
}

function renderArchiveList() {
  const archiveList = document.getElementById('archiveList');
  if (!archiveList) return;

  const completedTasks = allTasks.filter((t) => t.completed);
  archiveList.innerHTML = '';
  completedTasks.forEach((task) => {
    const taskEl = document.createElement('div');
    taskEl.style.cssText = 'background: #3a4150; padding: 15px; border-radius: 8px; margin-bottom: 10px; text-decoration: line-through; color: #999;';
    taskEl.innerHTML = `<p style="margin: 0;">${task.name}</p>`;
    archiveList.appendChild(taskEl);
  });
}

function setupTaskModal() {
  const modal = document.getElementById('todoModal');
  const saveBtn = document.getElementById('saveTask');
  const cancelBtn = document.getElementById('cancelTask');

  if (!modal) return;

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('taskName').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const focusTime = parseInt(document.getElementById('taskTime').value) || 0;
    const category = document.getElementById('taskMatrixType').value;

    if (!name) {
      alert('Please enter a task name');
      return;
    }

    try {
      await supabase.from('tasks').insert({
        user_id: currentUser.id,
        name,
        due_date: dueDate,
        focus_time: focusTime,
        category,
      });

      modal.classList.add('hidden');
      document.getElementById('taskName').value = '';
      document.getElementById('taskDueDate').value = '';
      document.getElementById('taskTime').value = '';
      document.getElementById('taskMatrixType').value = 'q1';

      await loadData();
      renderTodoSection();
    } catch (error) {
      alert('Error creating task: ' + error.message);
    }
  });
}

function openTaskModal() {
  const modal = document.getElementById('todoModal');
  if (modal) modal.classList.remove('hidden');
}

function setupHabitModal() {
  const modal = document.getElementById('habitModal');
  const saveBtn = document.getElementById('saveHabit');
  const cancelBtn = document.getElementById('cancelHabit');

  if (!modal) return;

  const freqRadios = document.querySelectorAll('input[name="freq"]');
  const customDaysDiv = document.getElementById('customDays');

  freqRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.value === 'custom') {
        customDaysDiv.classList.remove('hidden');
      } else {
        customDaysDiv.classList.add('hidden');
      }
    });
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('habitName').value;
    const frequency = document.querySelector('input[name="freq"]:checked').value;

    if (!name) {
      alert('Please enter a habit name');
      return;
    }

    let customDays = null;
    if (frequency === 'custom') {
      const selectedDays = Array.from(document.querySelectorAll('input[data-day]:checked')).map((cb) => parseInt(cb.dataset.day));
      customDays = selectedDays;
    }

    try {
      await supabase.from('habits').insert({
        user_id: currentUser.id,
        name,
        frequency,
        custom_days: customDays,
      });

      modal.classList.add('hidden');
      document.getElementById('habitName').value = '';
      document.querySelectorAll('input[name="freq"]').forEach((r) => {
        r.checked = r.value === 'daily';
      });
      document.querySelectorAll('input[data-day]').forEach((cb) => {
        cb.checked = false;
      });
      customDaysDiv.classList.add('hidden');

      await loadData();
      renderHabitsSection();
    } catch (error) {
      alert('Error creating habit: ' + error.message);
    }
  });
}

function openHabitModal() {
  const modal = document.getElementById('habitModal');
  if (modal) modal.classList.remove('hidden');
}

function setupReminderModal() {
  const modal = document.getElementById('reminderModal');
  const saveBtn = document.getElementById('saveReminder');
  const cancelBtn = document.getElementById('cancelReminder');

  if (!modal) return;

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  saveBtn.addEventListener('click', async () => {
    const title = document.getElementById('reminderTitle').value;
    const reminderDate = document.getElementById('reminderDate').value;
    const reminderTime = document.getElementById('reminderTime').value;

    if (!title || !reminderDate || !reminderTime) {
      alert('Please fill in all reminder fields');
      return;
    }

    try {
      await supabase.from('reminders').insert({
        user_id: currentUser.id,
        title,
        reminder_date: reminderDate,
        reminder_time: reminderTime,
      });

      modal.classList.add('hidden');
      document.getElementById('reminderTitle').value = '';
      document.getElementById('reminderDate').value = '';
      document.getElementById('reminderTime').value = '';

      await loadData();
      renderRemindersSection();
    } catch (error) {
      alert('Error creating reminder: ' + error.message);
    }
  });
}

function openReminderModal() {
  const modal = document.getElementById('reminderModal');
  if (modal) modal.classList.remove('hidden');
}

async function deleteTask(taskId) {
  if (confirm('Delete this task?')) {
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
      await loadData();
      renderTodoSection();
    } catch (error) {
      alert('Error deleting task: ' + error.message);
    }
  }
}

async function toggleTask(taskId, completed) {
  try {
    await supabase.from('tasks').update({ completed }).eq('id', taskId);
    await loadData();
    renderTodoSection();
  } catch (error) {
    alert('Error updating task: ' + error.message);
  }
}

async function deleteHabit(habitId) {
  if (confirm('Delete this habit?')) {
    try {
      await supabase.from('habits').delete().eq('id', habitId);
      await loadData();
      renderHabitsSection();
    } catch (error) {
      alert('Error deleting habit: ' + error.message);
    }
  }
}

async function deleteReminder(reminderId) {
  if (confirm('Delete this reminder?')) {
    try {
      await supabase.from('reminders').delete().eq('id', reminderId);
      await loadData();
      renderRemindersSection();
    } catch (error) {
      alert('Error deleting reminder: ' + error.message);
    }
  }
}

