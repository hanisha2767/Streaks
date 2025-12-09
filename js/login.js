const loginForm = document.getElementById('loginForm');
const messageEl = document.getElementById('message');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    messageEl.textContent = 'Logging in...';
    messageEl.style.color = '#05c26a';

    await login(email, password);

    messageEl.textContent = 'Login successful! Redirecting...';
    messageEl.style.color = '#05c26a';

    setTimeout(() => {
      window.location.href = 'welcome.html';
    }, 1000);
  } catch (error) {
    messageEl.textContent = error.message || 'Login failed. Check your credentials.';
    messageEl.style.color = '#ff6b6b';
  }
});
