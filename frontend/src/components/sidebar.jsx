// Updated: src/components/Sidebar.jsx (Using imports for reliable paths)
import dashboardIcon from "../assets/dashboard.png";
import habitsIcon from "../assets/habits.png";
import todoIcon from "../assets/todo.png";
import remindersIcon from "../assets/reminder.png";
import archiveIcon from "../assets/archive.png";

const items = [
  { id: "dashboard", label: "DASHBOARD", icon: dashboardIcon },
  { id: "habits", label: "HABITS", icon: habitsIcon },
  { id: "todo", label: "TO DO LIST", icon: todoIcon },
  { id: "reminders", label: "REMINDERS", icon: remindersIcon },
  { id: "archive", label: "ARCHIVE", icon: archiveIcon },
];


function Sidebar({ section, setSection }) {
  const handleClick = (id) => {
    setSection(id);
    localStorage.setItem("activeSection", id);  // Persist to localStorage
  };

  return (
    <nav className="side-bar">
      <div>
        <div style={{ marginTop: "20px" }}></div>


        {items.map((item) => (
          <div
            key={item.id}
            className={`nav-bar-icons ${section === item.id ? "active" : ""}`}
            onClick={() => handleClick(item.id)}
          >
            <img
              src={item.icon}
              alt={item.label}
              className="nav-icon"
            />
            <p>{item.label}</p>
          </div>
        ))}

      </div>
    </nav>
  );
}

export default Sidebar;
