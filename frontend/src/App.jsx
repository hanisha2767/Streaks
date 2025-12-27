import { Routes, Route, Navigate } from "react-router-dom";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ProtectedApp from "./components/ProtectedApp";

function App() {
  // ✅ AUTH SOURCE OF TRUTH
  const token = localStorage.getItem("token");
  const isAuthenticated = !!token;

  return (
    <Routes>
      {/* ROOT: redirect based on auth */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
        }
      />

      {/* AUTH ROUTES */}
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

      {/* PROTECTED MAIN APP */}
      <Route
        path="/dashboard/*"
        element={
          isAuthenticated ? <ProtectedApp /> : <Navigate to="/login" />
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
