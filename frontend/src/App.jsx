import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ProtectedApp from "./components/ProtectedApp";

function App() {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!user && !!token);
      setCheckedAuth(true);
    };

    checkAuth(); // Initial check

    window.addEventListener("auth-change", checkAuth);
    return () => window.removeEventListener("auth-change", checkAuth);
  }, []);

  // ⛔ WAIT until auth is checked
  if (!checkedAuth) {
    return <div style={{ color: "white", textAlign: "center" }}>Loading...</div>;
  }

  return (
    <Routes>
      {/* ROOT */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/signup" />
        }
      />

      {/* AUTH */}
      <Route
        path="/signup"
        element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
        }
      />

      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? <ProtectedApp /> : <Navigate to="/signup" />
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
