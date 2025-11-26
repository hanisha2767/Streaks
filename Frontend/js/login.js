// LOGIN handler — paste/replace into js/login.js
// Uses your Render URL as API_BASE
const API_BASE = "https://streaks-c41m.onrender.com";

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('message');

  if (!form) return console.warn('loginForm not found in DOM');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      msg.textContent = 'Please enter email and password';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        // try to show server message if provided
        const errText = await res.text().catch(() => '');
        let serverMsg = errText;
        try {
          const json = JSON.parse(errText || '{}');
          serverMsg = json.message || json.error || JSON.stringify(json);
        } catch (_) {}
        msg.textContent = serverMsg || `Login failed (${res.status})`;
        console.error('Login failed response:', res.status, errText);
        return;
      }

      const data = await res.json();
      console.log('login response:', data);

      // Normalize token & user info from common server shapes
      const token = data.token || data.authToken || data.accessToken || (data.user && data.user.token) || '';
      // username may be directly present or nested under user
      const username = data.username || data.name || (data.user && (data.user.name || data.user.username)) || '';
      const useremail = data.email || (data.user && data.user.email) || email; // fallback to submitted email

      if (!token) {
        // still proceed if server doesn't return token (dev servers sometimes do session cookie)
        console.warn('No token in login response — continuing but dashboard may require token.');
      }

      // IMPORTANT: use lowercase keys to match your main.js (friend's UI)
      if (token) localStorage.setItem('token', token);
      if (username) localStorage.setItem('username', username);
      if (useremail) localStorage.setItem('useremail', useremail);

      // navigate to dashboard index (adjust if your main page filename differs)
      window.location.href = 'index.html';
    } catch (err) {
      console.error('Login error:', err);
      msg.textContent = 'Network error. Check your backend or internet connection.';
    }
  });
});
