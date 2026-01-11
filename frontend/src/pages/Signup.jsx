import { supabase } from "../supabaseClient";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../css/styles-sign-up.css";
import logo from "../assets/logo.png";
import title from "../assets/title.png";


export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Signup successful! Please log in.");
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

        <button
          className="login-button"
          onClick={() => navigate("/login")}
        >
          Log In
        </button>
      </nav>

      {/* Middle */}
      <div className="middle">
        <div className="left-middle">
          <p className="tag-line">
            <span style={{ color: "#05c26a" }}>Small steps</span>
            <br />
            Big changes.
            <br />
            <span className="small-tag-line">
              Sign up for free to track your journey.
            </span>
          </p>
        </div>

        <div className="right-middle">
          <p className="sign-up">Sign up for free</p>

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

            <input
              className="input-box"
              type="password"
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              type="submit"
              className="continue"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Continue"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}

          <p style={{ color: "white", marginTop: "10px" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#05c26a" }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
