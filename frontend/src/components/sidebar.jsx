// Updated: src/components/Sidebar.jsx (Minor: Ensure activeSection persists on click)
const items = [
  { id: "dashboard", label: "DASHBOARD", icon: "/images/dashboard.png" },
  { id: "habits", label: "HABITS", icon: "/images/habits.png" },
  { id: "todo", label: "TO DO LIST", icon: "/images/todo.png" },
  { id: "reminders", label: "REMINDERS", icon: "/images/reminder.png" },
  { id: "archive", label: "ARCHIVE", icon: "/images/archive.png" },
];


function Sidebar({ section, setSection }) {
  const handleClick = (id) => {
    setSection(id);
    localStorage.setItem("activeSection", id);  // Persist to localStorage
  };

  return (
    <nav className="side-bar">
      <div>
        <div className="name">
          <img className="icon-logo" src="/images/logo.png" alt="logo" />
          <img className="title" src="/images/title.png" alt="title" />
        </div>

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
