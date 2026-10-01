/* js/auth.js — Login, logout, session management */

function saveSession(data) {
  localStorage.setItem('medibot_token', data.access_token);
  localStorage.setItem('medibot_role', data.role);
  localStorage.setItem('medibot_name', data.full_name);
}

const getSession = () => ({
  token: API.getToken(),
  role: localStorage.getItem('medibot_role'),
  name: localStorage.getItem('medibot_name'),
});

function clearSession() {
  ['medibot_token', 'medibot_role', 'medibot_name'].forEach(k => localStorage.removeItem(k));
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

/* ── Redirect if already logged in (on login page) ── */
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
  const { token } = getSession();
  if (token) window.location.href = 'dashboard.html';
}

/* ── Redirect if NOT logged in (on dashboard) ── */
if (window.location.pathname.endsWith('dashboard.html')) {
  const { token } = getSession();
  if (!token) window.location.href = 'index.html';
}

/* ── Login form handler ── */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errEl = document.getElementById('loginError');
    const btnText = document.getElementById('loginBtnText');
    const spinner = document.getElementById('loginSpinner');

    errEl.classList.add('hidden');
    btnText.textContent = 'Signing in...';
    spinner.classList.remove('hidden');

    try {
      const data = await API.login(email, password);
      saveSession(data);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btnText.textContent = 'Sign In';
      spinner.classList.add('hidden');
    }
  });
}
