import { supabase } from "../supabaseClient";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../css/styles-sign-up.css";
import logo from "../assets/logo.png";
import title from "../assets/title.png";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // ✅ Save user (optional, for your logic)
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.session.access_token); // ✅ Save token for backend
    localStorage.setItem("activeSection", "dashboard");

    setMessage("Login successful!");

    // ✅ Dispatch event to update App.jsx state
    window.dispatchEvent(new Event("auth-change"));

    navigate("/dashboard"); // ✅ Use React Router's navigate

    setLoading(false);
  };

  return (
    <>
      {/* Header */}
      <nav>
        <div className="con">
          <div className="name">
            <img className="icon-logo" src={logo} alt="logo" />
            <img className="title" src={title} alt="title" />
          </div>

          <ul className="info">
            <li>Get Started</li>
            <li>Mobile Apps</li>
            <li>Learn More</li>
          </ul>
        </div>
      </nav>

      {/* Middle */}
      <div className="middle">
        <div className="left-middle">
          <p className="tag-line">
            <span style={{ color: "#05c26a" }}>Welcome back!</span>
            <br />
            Log in to continue your journey.
          </p>
        </div>

        <div className="right-middle">
          <p className="sign-up">Log In</p>

          <form onSubmit={handleSubmit}>
            <input
              className="input-box"
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="input-box"
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="continue" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}

          <p style={{ color: "white", marginTop: "10px" }}>
            Don&apos;t have an account?{" "}
            <Link to="/signup" style={{ color: "#05c26a" }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
