import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

import Sidebar from "./components/sidebar";
import TopBar from "./components/topbar";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Todo from "./pages/Todo";
import Reminders from "./pages/Reminders";
import Archive from "./pages/Archive";

function App() {
  // auth session
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  // existing section logic (UNCHANGED)
  const [section, setSection] = useState(
    localStorage.getItem("activeSection") || "dashboard"
  );

  //  check auth state
  useEffect(() => {
    // get existing session on refresh
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // listen to login / logout
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // IF NOT LOGGED IN → LOGIN PAGE ONLY
  if (!session) {
    return authMode === "login" ? (
    <Login switchToSignup={() => setAuthMode("signup")} />
   ) : (
    <Signup switchToLogin={() => setAuthMode("login")} />
   );
  }

  // section renderer (UNCHANGED)
  const renderSection = () => {
    switch (section) {
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

  //  LOGGED IN → YOUR EXISTING APP UI
  return (
    <div className="app-root">
      <Sidebar section={section} setSection={setSection} />

      <div className="main-wrapper">
        <TopBar />
        <div id="main-content">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

export default App;
