// Updated: src/components/TopBar.jsx (Using imports for reliable paths)
import { useState, useEffect } from "react";
import logoImg from "../assets/logo.png";
import titleImg from "../assets/title.png";
import prfImg from "../assets/prf.png";
import logoutImg from "../assets/logout.png";

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
      <div className="name">
        <img className="icon-logo" src={logoImg} alt="logo" />
        <img className="title" src={titleImg} alt="title" />
      </div>

      <div className="info-1">
        <div className="profile">
          <div className="profile-info">
            <p className="para">@{name}</p>
            <p className="para">{email}</p>
          </div>

          <img
            className="profile-pic"
            src={prfImg}
            alt="profile"
          />

          <div className="info logout-wrapper" onClick={handleLogoutClick}>
            <img
              className="logo-logout"
              src={logoutImg}
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
