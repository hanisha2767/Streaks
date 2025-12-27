// Updated: src/components/TopBar.jsx (Fixed for React Router and "user" storage)
import { useState, useEffect } from "react";
function getNameFromEmail(email) {
  if (!email) return "User";

  const beforeAt = email.split("@")[0];
  const lettersOnly = beforeAt.replace(/[^a-zA-Z]/g, "");

  if (!lettersOnly) return "User";

  return (
    lettersOnly.charAt(0).toUpperCase() +
    lettersOnly.slice(1).toLowerCase()
  );
}

function TopBar({ onLogout }) {  // Accept onLogout prop
  const [name, setName] = useState("user");
  const [email, setEmail] = useState("user@email.com");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setEmail(user.email || "user@email.com");
    setName(getNameFromEmail(user.email));
  }, []);

  const handleLogoutClick = () => {
    localStorage.removeItem("userName");  // Backward compat, but not used
    localStorage.removeItem("userEmail");  // Backward compat, but not used
    localStorage.removeItem("activeSection");
    if (onLogout) onLogout();  // Use prop for navigation
  };

  return (
    <nav className="top-bar">
      <div className="info-1">
        <div className="profile">
          <div className="profile-info">
            <p className="para">@{name}</p>
            <p className="para">{email}</p>
          </div>

          <img
            className="profile-pic"
            src="/images/prf.png"
            alt="profile"
          />

          <div className="info logout-wrapper" onClick={handleLogoutClick}>
            <img
              className="logo-logout"
              src="/images/logout.png"
              alt="logout"
            />
            <span className="logout-tooltip">Logout</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default TopBar;
