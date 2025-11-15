document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#signUpForm');
  const emailInput = document.querySelector('#email');
  const passwordInput = document.querySelector('#password');
  const confirmInput = document.querySelector('#confirm-password');
  const messageBox = document.querySelector('#message');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirm = confirmInput.value.trim();

    // Basic validation
    if (!email || !password || !confirm) {
      showMessage('Please fill out all fields.', 'error');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (password !== confirm) {
      showMessage('Passwords do not match.', 'error');
      return;
    }

    // === SEND SIGNUP DATA TO BACKEND ===
    try {
      const res = await fetch("http://localhost:5000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.msg || "Server error. Please try again.", 'error');
        return;
      }

       if (data.msg === "Email already exists") {
         showMessage("Email already registered. Try logging in.", "error");
         return;
       }

      // Save name & email for UI display
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", email.split("@")[0]);

      showMessage("Signup successful! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "main.html";
      }, 1000);
      
    } catch (err) {
      console.error(err);
      showMessage("Server error. Please try again.", "error");
    }
  });

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.style.color = type === 'success' ? '#05c26a' : 'lightcoral';
  }
});

