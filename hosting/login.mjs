import { acceptInvite, getUser, handleAuthCallback, login, logout, requestPasswordRecovery, updateUser } from '@netlify/identity';
import shell from '../public/shiftmate-shell.html';

const content = document.querySelector('#accountContent');
let callback;
let user;
const escape = (value = '') => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const field = (name, label, type = 'text', value = '', extra = '') => `<label class="account-field">${label}<span class="${type === 'password' ? 'password-field' : ''}"><input name="${name}" type="${type}" value="${escape(value)}" required ${extra}>${type === 'password' ? '<button class="password-show" type="button" aria-label="Show password">Show</button>' : ''}</span></label>`;
const message = (text, success = false) => {
  const element = content.querySelector('[role="status"]');
  element.textContent = text;
  element.classList.toggle('success', success);
};
function bindForm(handler) {
  content.querySelectorAll('.password-show').forEach(button => button.onclick = () => {
    const input = button.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    button.textContent = input.type === 'password' ? 'Show' : 'Hide';
    button.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
  });
  content.querySelector('form').onsubmit = async event => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    message('');
    try { await handler(new FormData(event.target)); }
    catch (error) { message(error.message); }
    finally { button.disabled = false; }
  };
}
async function verifyAdmin() {
  const response = await fetch('/api/state', {cache:'no-store'});
  if (!response.ok) throw new Error(response.status === 403 ? 'This account needs an admin invitation. Contact your workspace owner.' : 'The workspace could not be loaded. Please try again.');
}
async function openDashboard() {
  await verifyAdmin();
  document.body.innerHTML = shell;
  const settings = document.createElement('a');
  settings.className = 'btn btn-small';
  settings.textContent = 'Profile settings';
  settings.href = '/profile/';
  document.querySelector('.topbar-actions').append(settings);
  document.querySelectorAll('[data-action="profile"]').forEach(element => {
    element.removeAttribute('data-action');
    element.addEventListener('click', () => location.assign('/profile/'));
  });
  const name = user?.userMetadata?.full_name || user?.email || 'Admin';
  const initials = name.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase();
  document.querySelectorAll('.profile-button b').forEach(element => element.textContent = name);
  document.querySelectorAll('.avatar').forEach(element => element.textContent = initials);
  const exit = document.createElement('button');
  exit.className = 'btn btn-small';
  exit.textContent = 'Sign out';
  exit.onclick = async () => { await logout(); location.replace('/'); };
  document.querySelector('.topbar-actions').append(exit);
  const script = document.createElement('script');
  script.src = '/app.js';
  document.body.append(script);
}
function renderAuth(mode = 'login') {
  const setup = callback?.type === 'invite' || callback?.type === 'recovery';
  const register = mode === 'register' || callback?.type === 'invite';
  const reset = mode === 'reset';
  const title = setup ? (callback.type === 'invite' ? 'Create your account' : 'Choose a new password') : reset ? 'Reset your password' : register ? 'Join your workspace' : 'Welcome back';
  content.innerHTML = `<span class="eyebrow">YOUR SHIFTMATE WORKSPACE</span><h2>${title}</h2><p class="account-description">${setup ? 'Set up your details to continue to your workspace.' : reset ? 'We’ll email you a link to securely reset your password.' : register ? 'Admin accounts are created through a workspace invitation. Open the invitation in your email to finish signing up.' : 'Sign in to manage your team and keep every shift covered.'}</p><form class="account-form">
  ${setup && callback.type === 'invite' ? field('name','Full name','text','','autocomplete="name" maxlength="80"') : ''}
  ${!setup ? field('email','Email address','email','','autocomplete="username" placeholder="you@company.com"') : ''}
  ${!reset && (!register || setup) ? field('password',setup ? 'New password' : 'Password','password','',setup ? 'autocomplete="new-password" minlength="12"' : 'autocomplete="current-password"') : ''}
  ${setup ? field('confirm','Confirm password','password','','autocomplete="new-password" minlength="12"')+'<p class="account-note">Use at least 12 characters for your password.</p>' : ''}
  <button type="submit" class="account-submit">${setup ? (callback.type === 'invite' ? 'Create account' : 'Save password') : reset || register ? 'Send password setup link' : 'Sign in'} →</button></form>
  <p class="account-message" role="status" aria-live="polite"></p><div class="account-actions"><a class="account-link" href="/">${reset || register || setup ? 'Back to sign in' : ''}</a>${!setup && !reset && !register ? '<button class="account-link" id="forgot">Forgot password?</button>' : ''}</div><div class="account-bottom">${register ? 'Already have an account? <a class="account-link" href="/">Sign in</a>' : 'Have a workspace invitation? <a class="account-link" href="/register/">Set up your account</a>'}</div>`;
  content.querySelector('#forgot')?.addEventListener('click', () => renderAuth('reset'));
  bindForm(async data => {
    if (reset || register && !setup) {
      await requestPasswordRecovery(data.get('email').trim());
      message('If your email has a workspace account, a password setup link is on its way. Check your inbox and Spam folder.', true);
      return;
    }
    const password = data.get('password');
    if (setup && password !== data.get('confirm')) throw new Error('Your passwords do not match.');
    if (callback?.type === 'invite') {
      user = await acceptInvite(callback.token, password);
      user = await login(user.email, password);
      user = await updateUser({data:{full_name:data.get('name').trim()}});
    } else if (callback?.type === 'recovery') {
      user = await updateUser({password});
    } else user = await login(data.get('email').trim(), password);
    callback = null;
    location.replace('/');
  });
}
function renderProfile(tab = 'personal') {
  const name = user.userMetadata?.full_name || '';
  const initials = (name || user.email).split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase();
  content.innerHTML = `<a class="account-link profile-back" href="/">← Back to workspace</a><div class="profile-heading"><div class="profile-avatar">${escape(initials)}</div><div><h2>Profile settings</h2><p>Manage your account details</p></div></div><div class="profile-tabs" role="tablist" aria-label="Profile sections"><button role="tab" aria-selected="${tab==='personal'}" id="personal">Personal details</button><button role="tab" aria-selected="${tab==='security'}" id="security">Password & security</button></div><form class="account-form">${tab === 'personal' ? field('name','Full name','text',name,'autocomplete="name" maxlength="80"')+field('email','Email address','email',user.email,'readonly')+'<p class="account-note">This email identifies your invited admin account.</p>' : field('current','Current password','password','','autocomplete="current-password"')+field('password','New password','password','','autocomplete="new-password" minlength="12"')+field('confirm','Confirm new password','password','','autocomplete="new-password" minlength="12"')+'<p class="account-note">Choose a password with at least 12 characters.</p>'}<button type="submit" class="account-submit">${tab === 'personal' ? 'Save changes' : 'Update password'}</button></form><p role="status" class="account-message" aria-live="polite"></p><button class="account-link profile-signout" id="signout">Sign out of ShiftMate</button>`;
  for (const id of ['personal','security']) content.querySelector('#'+id).onclick = () => renderProfile(id);
  content.querySelector('#signout').onclick = async () => { await logout(); location.replace('/'); };
  bindForm(async data => {
    if (tab === 'personal') {
      const name = data.get('name').trim();
      if (!name) throw new Error('Enter your full name.');
      user = await updateUser({data:{...user.userMetadata,full_name:name}});
      renderProfile();
      message('Your profile has been saved.',true);
    } else {
      if (data.get('password') !== data.get('confirm')) throw new Error('Your new passwords do not match.');
      await login(user.email,data.get('current'));
      user = await updateUser({password:data.get('password')});
      content.querySelector('form').reset();
      message('Your password has been updated.',true);
    }
  });
}
try {
  callback = await handleAuthCallback();
  user = await getUser();
  if (callback) renderAuth();
  else if (location.pathname.startsWith('/profile')) {
    if (!user) location.replace('/');
    else { await verifyAdmin(); renderProfile(); }
  } else if (user && !location.pathname.startsWith('/register')) await openDashboard();
  else renderAuth(location.pathname.startsWith('/register') ? 'register' : 'login');
} catch (error) {
  renderAuth();
  message(error.message);
}
