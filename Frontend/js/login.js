document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#loginForm");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const messageBox = document.querySelector("#message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showMessage("Please fill out all fields.", "error");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.msg || "Invalid credentials!", "error");
        return;
      }

      // Save token + user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("userName", data.name);

      showMessage("Login successful! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "main.html";
      }, 1000);

    } catch (err) {
      console.error(err);
      showMessage("Server error. Try again later.", "error");
    }
  });

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.style.color = type === "success" ? "#05c26a" : "lightcoral";
  }
});
