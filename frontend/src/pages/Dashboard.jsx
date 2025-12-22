import { apiFetch, getWeeklyFocus } from "../api";
import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { supabase } from "../supabaseClient";

function Dashboard() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [dateText, setDateText] = useState("");
  const [greeting, setGreeting] = useState("");
  const [user, setUser] = useState(null);

  const [todoCount, setTodoCount] = useState(0);
  const [habitTotal, setHabitTotal] = useState(0);
  const [habitCompleted, setHabitCompleted] = useState(0);
  const [upcomingReminders, setUpcomingReminders] = useState(0);

  useEffect(() => {
    /* ================= USER ================= */
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    /* ================= SUMMARY ================= */
    async function loadSummary() {
      try {
        const data = await apiFetch("/dashboard/summary");
        setTodoCount(data.todoCount);
        setHabitTotal(data.habitTotal);
        setHabitCompleted(data.habitCompleted);
        setUpcomingReminders(data.upcomingReminders);
      } catch (err) {
        console.error("Dashboard summary error:", err.message);
      }
    }

    /* ================= DATE + GREETING ================= */
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
      hour < 12
        ? "Good morning"
        : hour < 18
        ? "Good afternoon"
        : "Good evening"
    );

    /* ================= FOCUS CHART ================= */
    async function loadFocusChart() {
      try {
        const focusData = await getWeeklyFocus(); // 🔥 BACKEND DATA

        const labels = [];
        const values = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];

          labels.push(
            d.toLocaleDateString("en-US", { weekday: "short" })
          );
          values.push(focusData[key] || 0);
        }

        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(chartRef.current, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Focus Minutes",
                data: values,
                backgroundColor: "#05c26a",
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, border: { display: false } },
              y: {
                grid: { display: false },
                border: { display: false },
                ticks: { display: false },
              },
            },
          },
        });
      } catch (err) {
        console.error("Focus chart error:", err.message);
      }
    }

    loadSummary();
    loadFocusChart();
  }, []);

  return (
    <section id="dashboard-section">
      <div className="date-div">
        <p className="date-sub">{dateText}</p>

        <p className="greet-apple">
          {greeting}, <span>@{user?.email?.split("@")[0]}</span>
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
            <p className="title-middle">Focus Hours (This Week)</p>
            <canvas ref={chartRef} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
