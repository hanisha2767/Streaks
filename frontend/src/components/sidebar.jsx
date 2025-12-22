const items = [
  { id: "dashboard", label: "DASHBOARD" },
  { id: "habits", label: "HABITS" },
  { id: "todo", label: "TO DO LIST" },
  { id: "reminders", label: "REMINDERS" },
  { id: "archive", label: "ARCHIVE" },
];

function Sidebar({ section, setSection }) {
  const handleClick = (id) => {
    setSection(id);
    localStorage.setItem("activeSection", id);
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
            className={`nav-bar-icons ${
              section === item.id ? "active" : ""
            }`}
            onClick={() => handleClick(item.id)}
          >
            <p>{item.label}</p>
          </div>
        ))}
      </div>
    </nav>
  );
}

export default Sidebar;
