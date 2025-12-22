import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function TopBar() {
  const [user, setUser] = useState(null);

  // get logged-in user info
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // logout using supabase
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("activeSection"); // optional cleanup
  };

  return (
    <nav className="top-bar">
      <div className="info-1">
        <div className="profile">
          <div className="profile-info">
            <p className="para">@{user?.email?.split("@")[0] || "user"}</p>
            <p className="para">{user?.email}</p>
          </div>

          <img
            className="profile-pic"
            src="/images/prf.png"
            alt="profile"
          />

          <div className="info logout-wrapper" onClick={handleLogout}>
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
