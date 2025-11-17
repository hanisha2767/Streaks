document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#signUpForm');
  const emailInput = document.querySelector('#email');
  const passwordInput = document.querySelector('#password');
  const confirmInput = document.querySelector('#confirm-password');
  const messageBox = document.querySelector('#message');

  form.addEventListener('submit', e => {
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

    // Save to localStorage
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', email.split('@')[0]);

    showMessage('Sign-up successful! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'index.html'; // Redirect to dashboard
    }, 1200);
  });

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.style.color = type === 'success' ? '#05c26a' : 'lightcoral';
  }
});
