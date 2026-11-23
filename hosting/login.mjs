import { acceptInvite, getUser, handleAuthCallback, login, logout, updateUser } from '@netlify/identity';
import shell from '../public/shiftmate-shell.html';
const form = document.querySelector('#credentials');
const message = document.querySelector('#message');
let callback;
async function openDashboard() {
  const response = await fetch('/api/state', {cache:'no-store'});
  if (!response.ok) throw new Error(response.status === 403 ? 'This account does not have admin access.' : 'The workspace database is unavailable.');
  document.body.innerHTML = shell;
  const exit = document.createElement('button');
  exit.className = 'btn btn-small';
  exit.textContent = 'Sign out';
  exit.onclick = async () => { await logout(); location.replace('/'); };
  document.querySelector('.topbar-actions').append(exit);
  const script = document.createElement('script');
  script.src = '/app.js';
  document.body.append(script);
}
try {
  callback = await handleAuthCallback();
  if (callback?.type === 'invite' || callback?.type === 'recovery') {
    form.elements.email.closest('p').remove();
    form.elements.password.autocomplete = 'new-password';
    form.querySelector('button').textContent = 'Set admin password';
  } else if (await getUser()) await openDashboard();
} catch (error) { message.textContent = error.message; }
form.onsubmit = async event => {
  event.preventDefault();
  try {
    const password = form.elements.password.value;
    if (callback?.type === 'invite') await acceptInvite(callback.token,password);
    else if (callback?.type === 'recovery') await updateUser({password});
    else await login(form.elements.email.value,password);
    await openDashboard();
  } catch (error) { message.textContent = error.message; }
};
