// Dashboard.jsx (fixed: todoCount & focus chart now use localStorage + correct events)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

// Keep streak calculation consistent with Habits.jsx
function calculateStreak(completedDates) {
  if (!completedDates || completedDates.length === 0) return 0;

  const uniqueDates = [...new Set(completedDates)];
  const sorted = uniqueDates.slice().sort((a, b) => b.localeCompare(a)); // YYYY-MM-DD desc

  const parseDate = (dateStr) => {
    const parts = String(dateStr).split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10); // tolerates "DDT..."
    return new Date(year, month, day, 0, 0, 0, 0);
  };

  const latestDate = parseDate(sorted[0]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (latestDate.getTime() < yesterday.getTime()) {
    return 0;
  }

  let streak = 1;
  let current = latestDate;

  for (let i = 1; i < sorted.length; i++) {
    const expected = new Date(current);
    expected.setDate(expected.getDate() - 1);

    const nextDate = parseDate(sorted[i]);
    if (nextDate.getTime() === expected.getTime()) {
      streak++;
      current = expected;
    } else {
      break;
    }
  }

  return streak;
}

/* ================= CACHE ================= */

const CACHE_KEY = "dashboard_cache_v1";
const CACHE_TTL = 60 * 1000; // 1 minute

function getCachedDashboard() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.time > CACHE_TTL) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedDashboard(data) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ time: Date.now(), data })
  );
}

/* ================= COMPONENT ================= */

function Dashboard() {
  const navigate = useNavigate();
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* ================= TODO COUNT (BACKEND SOURCE OF TRUTH) ================= */
  useEffect(() => {
    const updateTodoCount = async () => {
      const headers = getAuthHeaders();
      if (!headers) return;

      try {
        const res = await fetch(`${API_BASE}/dashboard/summary`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        setTodoCount(data.todos ?? 0);
      } catch {
        // Fallback to local cache if backend unreachable
        const stored = JSON.parse(localStorage.getItem("tasks")) || [];
        setTodoCount(stored.filter(t => !t.completed && !t.archived).length);
      }
    };

    updateTodoCount();
    window.addEventListener("tasks-updated", updateTodoCount);

    return () => {
      window.removeEventListener("tasks-updated", updateTodoCount);
    };
  }, []);

  /* ================= FOCUS CHART (now from localStorage) ================= */

  const loadFocus = async () => {
    const headers = getAuthHeaders();

    // Prefer backend source-of-truth
    let labels = [];
    let values = [];

    if (headers) {
      try {
        const res = await fetch(`${API_BASE}/focus/weekly`, { headers });
        if (res.ok) {
          const weekly = await res.json();
          // backend returns [{ day: "Sun", minutes: N }, ...]
          labels = (weekly || []).map(d => d.day);
          values = (weekly || []).map(d => d.minutes);
        }
      } catch {
        // fall through to localStorage
      }
    }

    // Fallback to localStorage for offline/legacy
    if (labels.length === 0) {
      const focusData = JSON.parse(localStorage.getItem("focusHours")) || {};
      const today = new Date();
      const weekData = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayShort = date.toLocaleDateString("en-US", { weekday: "short" });
        const minutes = focusData[dateStr] || 0;
        weekData.push({ day: dayShort, minutes });
      }

      labels = weekData.map(d => d.day);
      values = weekData.map(d => d.minutes);
    }

    requestAnimationFrame(() => {
      if (!chartRef.current) return;

      if (chartInstance.current) {
        chartInstance.current.data.labels = labels;
        chartInstance.current.data.datasets[0].data = values;
        chartInstance.current.update();
        return;
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
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
    });
  };

  /* ================= MAIN EFFECT ================= */

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers) {
      navigate("/login");
      return;
    }

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

    /* ⚡ LOAD FROM CACHE FIRST */
    const cached = getCachedDashboard();
    if (cached) {
      setUsername(cached.username);
      if (cached.todos !== undefined) setTodoCount(cached.todos);
      setHabitTotal(cached.habits);
      setHabitCompleted(cached.habitCompleted);
      setUpcomingReminders(cached.reminders);
      setHabitStreaks(cached.habitStreaks);
      setReminderList(cached.reminderList);
      setLoading(false);
    }

    /* 🔄 FETCH IN BACKGROUND (other data only) */
    Promise.all([
      fetch(`${API_BASE}/auth/me`, { headers }),
      fetch(`${API_BASE}/dashboard/summary`, { headers }),
      fetch(`${API_BASE}/habits`, { headers }),
    ])
      .then(async ([userRes, dashRes, habitsRes]) => {
        if (!dashRes.ok) {
          if (dashRes.status === 401 || dashRes.status === 403) {
            localStorage.clear();
            navigate("/login");
          }
          return null;
        }

        const user = userRes.ok ? await userRes.json() : null;
        const data = await dashRes.json();
        const habitsList = habitsRes.ok ? await habitsRes.json() : [];

        const finalUsername = user?.email
          ? getNameFromEmail(user.email)
          : "User";

        setUsername(finalUsername);
        setTodoCount(data.todos ?? 0);
        setHabitTotal(data.habits ?? 0);
        setHabitCompleted(data.habitCompleted ?? 0);
        setUpcomingReminders(data.reminders ?? 0);
        // Compute streaks exactly like Habits page, so numbers match
        const computedHabitStreaks = Array.isArray(habitsList)
          ? habitsList.map((h) => ({
              name: h.name,
              streak: calculateStreak(h.completedDates),
            }))
          : [];
        setHabitStreaks(computedHabitStreaks);
        setReminderList(data.reminderList || []);

        setCachedDashboard({
          username: finalUsername,
          todos: data.todos ?? 0,
          habits: data.habits ?? 0,
          habitCompleted: data.habitCompleted ?? 0,
          reminders: data.reminders ?? 0,
          habitStreaks: computedHabitStreaks,
          reminderList: data.reminderList || [],
        });

        setLoading(false);
      })
      .catch(err => {
        console.error("Dashboard fetch error:", err);
        setError(true);
        setLoading(false);
      });
  }, []);

  /* ================= CHART LOAD ================= */

  useEffect(() => {
    if (loading) return;
    loadFocus();
    window.addEventListener("focusUpdated", loadFocus);

    return () => {
      window.removeEventListener("focusUpdated", loadFocus);
    };
  }, [loading]);

  if (loading)
    return <div style={{ marginTop: "120px", marginLeft: "320px", color: "#fff" }}>Loading Dashboard...</div>;

  if (error)
    return <div style={{ marginTop: "120px", marginLeft: "320px", color: "red" }}>Failed to load data.</div>;

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
            <p className="middle-p">{habitCompleted}/{habitTotal} completed</p>
          </div>

          <div className="box-1">
            <p className="title-middle">Reminders</p>
            <p className="middle-p">Upcoming: {upcomingReminders}</p>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <p className="title-middle">Focus Minutes (Last 7 Days)</p>
            <canvas ref={chartRef} style={{ height: "220px" }} />
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
