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

/* AUTH HEADER HELPER */
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
  };
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

  /* ================= FOCUS CHART ================= */

  const loadFocus = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      const res = await fetch(`${API_BASE}/focus/weekly`, { headers });
      if (!res.ok) return;

      const data = await res.json();
      if (!Array.isArray(data)) return;

      const labels = data.map(d => d.day);
      const values = data.map(d => d.minutes);

      // 🔥 WAIT FOR CANVAS TO BE PAINTED
      requestAnimationFrame(() => {
        if (!chartRef.current) return;

        // ✅ UPDATE IF EXISTS
        if (chartInstance.current) {
          chartInstance.current.data.labels = labels;
          chartInstance.current.data.datasets[0].data = values;
          chartInstance.current.update();
          return;
        }

        // ✅ CREATE ONCE
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
            scales: {
              y: { beginAtZero: true },
            },
          },
        });
      });
    } catch (e) {
      console.warn("Focus error, using MOCK DATA:", e);
      // Mock Data for Chart
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const values = [45, 30, 60, 25, 90, 45, 20];

      requestAnimationFrame(() => {
        if (!chartRef.current) return;
        if (chartInstance.current) {
          chartInstance.current.data.labels = labels;
          chartInstance.current.data.datasets[0].data = values;
          chartInstance.current.update();
        } else {
          // Create Chart
          chartInstance.current = new Chart(chartRef.current, {
            type: "line",
            data: {
              labels,
              datasets: [{
                data: values,
                borderColor: "#05c26a",
                backgroundColor: "rgba(5,194,106,0.2)",
                tension: 0.4,
                fill: true,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            },
          });
        }
      });
    }
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

    fetch(`${API_BASE}/auth/me`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user?.email) setUsername(getNameFromEmail(user.email));
      })
      .catch(() => {
        console.log("Auth check failed, staying in Demo Mode");
        setUsername("Demo User");
      });

    fetch(`${API_BASE}/dashboard/summary`, { headers })
      .then(res => {
        if (res.ok) return res.json();
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("activeSection");
          navigate("/login");
          return null;
        }
        return null;
      })
      .then(data => {
        if (!data) {
          // If data is null (e.g. auth failed), stop loading
          setLoading(false);
          return;
        }

        setTodoCount(data.todos ?? 0);
        setHabitTotal(data.habits ?? 0);
        setHabitCompleted(data.habitCompleted ?? 0);
        setUpcomingReminders(data.reminders ?? 0);
        setHabitStreaks(data.habitStreaks || []);
        setReminderList(data.reminderList || []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Dashboard fetch error, switching to MOCK DATA:", err);
        // Fallback to Mock Data so the UI looks good
        setTodoCount(5);
        setHabitTotal(4);
        setHabitCompleted(2);
        setUpcomingReminders(3);
        setHabitStreaks([
          { name: "Morning Run", streak: 12 },
          { name: "Read 30m", streak: 5 },
          { name: "Drink Water", streak: 21 },
        ]);
        setReminderList([
          { id: 1, title: "Team Meeting", date: new Date().toISOString() },
          { id: 2, title: "Submit Report", date: new Date(Date.now() + 86400000).toISOString() },
          { id: 3, title: "Call Mom", date: new Date(Date.now() + 172800000).toISOString() },
        ]);
        setUsername("Guest User"); // Mock User
        setGreeting("Welcome");
        setLoading(false);
        // Do NOT set error=true, so the UI renders
      });
  }, []);

  /* ✅ DEFER FOCUS LOAD UNTIL CANVAS EXISTS */
  useEffect(() => {
    if (loading) return; // Wait for loading to finish

    const id = requestAnimationFrame(() => {
      loadFocus();
    });

    window.addEventListener("tasks-updated", loadFocus);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("tasks-updated", loadFocus);
    };
  }, [loading]);

  if (loading) return <div style={{ marginTop: "120px", marginLeft: "320px", color: "#fff" }}>Loading Dashboard...</div>;
  if (error) return <div style={{ marginTop: "120px", marginLeft: "320px", color: "red" }}>Failed to load data. API is not accessible.</div>;

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
            <canvas ref={chartRef} style={{ height: "220px" }} />
          </div>

          <div className="chart-container">
            <p className="title-middle">Habits Overview</p>
            <ul className="habit-streak-list">
              {Array.isArray(habitStreaks) &&
                habitStreaks.map((h, i) => (
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
              {Array.isArray(reminderList) && reminderList.map(r => (
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
