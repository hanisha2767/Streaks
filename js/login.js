document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#loginForm");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const messageBox = document.querySelector("#message");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    const savedEmail = localStorage.getItem("userEmail");
    const savedPassword = localStorage.getItem("userPassword");

    if (!email || !password) {
      showMessage("Please fill out all fields.", "error");
      return;
    }

    if (email !== savedEmail || password !== savedPassword) {
      showMessage("Invalid email or password!", "error");
      return;
    }

    showMessage("Login successful! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "main.html";
    }, 1000);
  });

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.style.color = type === "success" ? "#05c26a" : "lightcoral";
  }
});
