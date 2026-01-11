// New file: src/components/ProtectedApp.jsx (Container for protected content)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "./topbar";  // Note: Your file is topbar.jsx, but exported as TopBar
import Sidebar from "./sidebar";
import Dashboard from "../pages/Dashboard";
import Todo from "../pages/Todo";
import Habits from "../pages/Habits";
import Reminders from "../pages/Reminders";
import Archive from "../pages/Archive";

export default function ProtectedApp() {
  const navigate = useNavigate();
  const [section, setSection] = useState("dashboard");

  // Load active section from localStorage on mount
  useEffect(() => {
    const savedSection = localStorage.getItem("activeSection") || "dashboard";
    setSection(savedSection);
    if (!localStorage.getItem("activeSection")) {
      localStorage.setItem("activeSection", "dashboard");
    }
  }, []);

  // Render component based on section
  const renderSection = () => {
    switch (section) {
      case "dashboard":
        return <Dashboard />;
      case "habits":
        return <Habits />;
      case "todo":
        return <Todo />;
      case "reminders":
        return <Reminders />;
      case "archive":
        return <Archive />;
      default:
        return <Dashboard />;
    }
  };

  // Logout handler (shared with TopBar)
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token"); // ✅ Clear token
    localStorage.removeItem("activeSection");

    // ✅ Dispatch event to update App.jsx state
    window.dispatchEvent(new Event("auth-change"));

    navigate("/login");
  };


  return (
    <div className="app-layout">
      <TopBar onLogout={handleLogout} />  {/* Pass handler for logout */}
      <div className="main-content">
        <Sidebar section={section} setSection={setSection} />
        <div className="page-content">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}