import { acceptInvite, getUser, handleAuthCallback, login, logout, requestPasswordRecovery, updateUser } from '@netlify/identity';
import shell from '../public/shiftmate-shell.html';
const form = document.querySelector('#credentials');
const message = document.querySelector('#message');
let callback;
const reset = document.createElement('button');
reset.type = 'button';
reset.className = 'btn btn-small';
reset.textContent = 'Email me a password reset link';
form.after(reset);
reset.onclick = async () => {
  const email = form.elements.email;
  if (!email) {
    location.replace('/');
    return;
  }
  if (!email.reportValidity()) return;
  reset.disabled = true;
  try {
    await requestPasswordRecovery(email.value.trim());
    message.textContent = 'Check your inbox for a new password reset email. Open the newest link once.';
  } catch {
    message.textContent = 'We could not request a reset link. Please try again shortly.';
  } finally {
    reset.disabled = false;
  }
};
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
    reset.textContent = 'Return to sign-in or request a new link';
    form.elements.password.autocomplete = 'new-password';
    form.querySelector('button').textContent = 'Set admin password';
  } else if (await getUser()) await openDashboard();
} catch (error) { message.textContent = error.message; }
form.onsubmit = async event => {
  event.preventDefault();
  const submit = form.querySelector('button');
  if (submit.disabled) return;
  submit.disabled = true;
  message.textContent = '';
  try {
    const password = form.elements.password.value;
    if (callback?.type === 'invite') {
      const owner = await acceptInvite(callback.token, password);
      callback = null;
      await login(owner.email, password);
    }
    else if (callback?.type === 'recovery') await updateUser({password});
    else await login(form.elements.email.value,password);
    await openDashboard();
  } catch (error) {
    message.textContent = callback?.type === 'invite' && /not found|expired|invalid.*token/i.test(error.message)
      ? 'This invitation could not be verified. Return to sign-in and request a new password reset link for your admin email.'
      : error.message;
  } finally { submit.disabled = false; }
};
