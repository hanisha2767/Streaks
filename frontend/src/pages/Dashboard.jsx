import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { API_BASE } from "../config";

/* ================= HELPERS ================= */

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getNameFromEmail(email) {
  if (!email) return "User";
  const name = email.split("@")[0].replace(/[^a-zA-Z]/g, "");
  return name
    ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    : "User";
}

/* ================= COMPONENT ================= */

function Dashboard() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [dateText, setDateText] = useState("");
  const [greeting, setGreeting] = useState("");
  const [username, setUsername] = useState("User");

  const [todoCount, setTodoCount] = useState(0);
  const [habitTotal, setHabitTotal] = useState(0);
  const [habitCompleted, setHabitCompleted] = useState(0);
  const [upcomingReminders, setUpcomingReminders] = useState(0);
  const [habitStreaks, setHabitStreaks] = useState([]);
  const [reminderList, setReminderList] = useState([]);

  /* ================= CHART ================= */

  const renderChart = (focusData) => {
    if (!chartRef.current) return;

    const labels = focusData.map(d => d.day);
    const values = focusData.map(d => d.minutes);

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: "#05c26a",
            backgroundColor: "rgba(5,194,106,0.2)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#05c26a",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: v => `${v}m` },
          },
        },
      },
    });
  };

  /* ================= EFFECT ================= */

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("No token found");
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  /* DATE + GREETING */
  const now = new Date();
  setDateText(
    now.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  );

  const hour = now.getHours();
  setGreeting(
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  );

  /* LOAD USER */
  fetch(`${API_BASE}/auth/me`, { headers })
    .then(res => res.ok ? res.json() : null)
    .then(user => {
      if (user?.email) {
        setUsername(getNameFromEmail(user.email));
      }
    })
    .catch(err => console.error("User error:", err));

  /* LOAD DASHBOARD SUMMARY */
  fetch(`${API_BASE}/dashboard/summary`, { headers })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!data) return;
      setTodoCount(data.todos || 0);
      setHabitTotal(data.habits || 0);
      setHabitCompleted(data.habitCompleted || 0);
      setUpcomingReminders(data.reminders || 0);
      setHabitStreaks(data.habitStreaks || []);
      setReminderList(data.reminderList || []);
    })
    .catch(err => console.error("Dashboard error:", err));

  /* LOAD FOCUS */
 const loadFocus = async () => {
  try {
    const res = await fetch(`${API_BASE}/focus/weekly`, { headers });
    if (!res.ok) throw new Error("Focus API failed");

    const data = await res.json();
    // data = [{ day: "Sat", minutes: 30 }]

    const labels = [];
    const values = [];

    // Map focus minutes by weekday
    const focusMap = {};
    data.forEach(item => {
      focusMap[item.day] = item.minutes;
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const dayLabel = d.toLocaleDateString("en-US", {
        weekday: "short",
      });

      labels.push(dayLabel);
      values.push(focusMap[dayLabel] || 0);
    }

    renderChart(labels, values);
  } catch (err) {
    console.error("Focus error:", err);
  }
};

loadFocus();

  // ✅ CLEANUP ONLY
  return () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
  };
}, []);


  /* ================= JSX ================= */

  return (
    <section id="dashboard-section">
      <div className="date-div">
        <p className="date-sub">{dateText}</p>

        <p className="greet-apple">
          {greeting}, <span>{username}</span>
        </p>

        <div className="middle-part">
          <div className="box-1">
            <p className="title-middle">Daily Summary</p>
            <p className="middle-p">To do tasks: {todoCount}</p>
          </div>

          <div className="box-1">
            <p className="title-middle">Habits</p>
            <p className="middle-p">
              {habitCompleted}/{habitTotal} completed
            </p>
          </div>

          <div className="box-1">
            <p className="title-middle">Reminders</p>
            <p className="middle-p">Upcoming: {upcomingReminders}</p>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <p className="title-middle">Focus Minutes (This Week)</p>
            <canvas ref={chartRef} />
          </div>

          <div className="chart-container">
            <p className="title-middle">Habits Overview</p>
            <ul className="habit-streak-list">
              {habitStreaks.map((h, i) => (
                <li key={i} className="habit-streak-item">
                  <span>{h.name}</span>
                  <span>🔥 {h.streak}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="chart-container reminders-mini">
            <p className="title-middle">Upcoming Reminders</p>
            <ul className="reminder-mini-list">
              {reminderList.map(r => (
                <li key={r.id} className="reminder-mini-item">
                  <p>{r.title}</p>
                  <span>📅 {formatDate(r.date)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
