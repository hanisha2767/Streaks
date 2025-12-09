const signUpForm = document.getElementById('signUpForm');
const messageEl = document.getElementById('message');

signUpForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password !== confirmPassword) {
    messageEl.textContent = 'Passwords do not match!';
    messageEl.style.color = '#ff6b6b';
    return;
  }

  if (password.length < 6) {
    messageEl.textContent = 'Password must be at least 6 characters!';
    messageEl.style.color = '#ff6b6b';
    return;
  }

  try {
    messageEl.textContent = 'Creating account...';
    messageEl.style.color = '#05c26a';

    await signUp(email, password);

    messageEl.textContent = 'Account created! Redirecting to login...';
    messageEl.style.color = '#05c26a';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  } catch (error) {
    messageEl.textContent = error.message || 'Sign-up failed. Try again.';
    messageEl.style.color = '#ff6b6b';
  }
});
