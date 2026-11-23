import { acceptInvite, getUser, handleAuthCallback, login, logout, requestPasswordRecovery, updateUser } from '@netlify/identity';
import { applyPreferences } from './preferences.mjs';
import { showWorkspacePage } from './workspace-pages.mjs';
import shell from '../public/shiftmate-shell.html';

const content = document.querySelector('#accountContent');
let callback;
let user;
let role;
let company = {};
try { applyPreferences(JSON.parse(localStorage.getItem('shiftmate-preferences') || '{}')); } catch {}
async function request(path, data) {
  const response = await fetch(path, data ? {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)} : {cache:'no-store'});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}
const escape = (value = '') => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const field = (name, label, type = 'text', value = '', extra = '') => `<label class="account-field">${label}<span class="${type === 'password' ? 'password-field' : ''}"><input name="${name}" type="${type}" value="${escape(value)}" ${extra.includes('data-optional') ? '' : 'required'} ${extra}>${type === 'password' ? '<button class="password-show" type="button" aria-label="Show password">Show</button>' : ''}</span></label>`;
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
    if (!button || button.disabled) return;
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
  if (role === 'recruiter') { location.replace('/recruiter/'); return; }
  await verifyAdmin();
  document.body.innerHTML = shell;
  const settings = document.createElement('a');
  settings.className = 'btn btn-small';
  settings.textContent = 'Profile settings';
  settings.href = '/profile/';
  document.querySelector('.topbar-actions').append(settings);
  for (const [label,path] of [['Team access','/team/'],['Activity log','/activity/']]) {
    const link = document.createElement('a');
    link.className = 'btn btn-small';
    link.textContent = label;
    link.href = path;
    document.querySelector('.topbar-actions').append(link);
  }
  if (company.name) {
    document.querySelector('.workspace-label b').textContent = company.name;
    document.querySelector('.workspace-icon').textContent = company.name[0].toUpperCase();
  }
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
  const title = setup ? (callback.type === 'invite' ? 'Create your account' : 'Choose a new password') : reset ? 'Reset your password' : register ? 'Join your workspace' : (location.pathname.startsWith('/recruiter') ? 'Recruiter login' : 'Welcome back');
  content.innerHTML = `<span class="eyebrow">YOUR SHIFTMATE WORKSPACE</span><h2>${title}</h2><p class="account-description">${setup ? 'Set up your details to continue to your workspace.' : reset ? 'We’ll email you a link to securely reset your password.' : register ? 'Admin accounts are created through a workspace invitation. Open the invitation in your email to finish signing up.' : 'Sign in to manage your team and keep every shift covered.'}</p><form class="account-form">
  ${setup && callback.type === 'invite' ? field('name','Full name','text','','autocomplete="name" maxlength="80"') : ''}
  ${!setup ? field('email','Email address','email','','autocomplete="username" placeholder="you@company.com"') : ''}
  ${!reset && (!register || setup) ? field('password',setup ? 'New password' : 'Password','password','',setup ? 'autocomplete="new-password" minlength="12"' : 'autocomplete="current-password"') : ''}
  ${setup ? field('confirm','Confirm password','password','','autocomplete="new-password" minlength="12"')+'<p class="account-note">Use at least 12 characters for your password.</p>' : ''}
  <button type="submit" class="account-submit">${setup ? (callback.type === 'invite' ? 'Create account' : 'Save password') : reset || register ? 'Send password setup link' : 'Sign in'} →</button></form>
  <p class="account-message" role="status" aria-live="polite"></p><div class="account-actions"><a class="account-link" href="/">${reset || register || setup ? 'Back to sign in' : ''}</a>${!setup && !reset && !register ? '<button class="account-link" id="forgot">Forgot password?</button>' : ''}</div><div class="account-bottom">${register ? 'Already have an account? <a class="account-link" href="/">Sign in</a>' : 'Have a workspace invitation? <a class="account-link" href="/register/">Set up your account</a><p><a class="account-link" href="/recruiter/">Recruiter login</a></p>'}</div>`;
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
    await request('/api/session',{});
    location.replace('/');
  });
}
function renderProfile(tab = 'personal') {
  const preferences = user.userMetadata || {};
  const name = preferences.full_name || '';
  const initials = (name || user.email).split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const select = (key,label,options,value) => `<label class="account-field">${label}<select name="${key}">${options.map(([id,title])=>`<option value="${id}" ${id===value?'selected':''}>${title}</option>`).join('')}</select></label>`;
  let fields;
  if (tab==='personal') fields = field('name','Full name','text',name,'autocomplete="name" maxlength="80"')+field('email','Email address','email',user.email,'readonly')+
    field('phone','Phone number','tel',preferences.phone||'','autocomplete="tel" maxlength="30" data-optional')+field('jobTitle','Job title','text',preferences.jobTitle||'','maxlength="80" data-optional');
  if (tab==='security') fields = field('current','Current password','password','','autocomplete="current-password"')+field('password','New password','password','','autocomplete="new-password" minlength="12"')+field('confirm','Confirm new password','password','','autocomplete="new-password" minlength="12"')+'<p class="account-note">Choose a password with at least 12 characters.</p>';
  if (tab==='preferences') fields = select('theme','Theme',[['system','System'],['light','Light'],['dark','Dark']],preferences.theme||'system')+
    select('language','Language',[['en','English'],['ms','Bahasa Melayu']],preferences.language||'en')+
    '<p class="account-note">Scheduling uses Malaysia time (Asia/Kuala_Lumpur).</p>';
  if (tab==='company') fields = ['name','phone','address','website'].map((key,index)=>field(key,['Company name','Phone number','Company address','Website'][index],'text',company[key]||'',role==='admin'?(index===0?'maxlength="250"':'maxlength="250" data-optional'):'readonly')).join('');
  content.innerHTML = `<a class="account-link profile-back" href="/">← Back to workspace</a><div class="profile-heading"><div class="profile-avatar">${escape(initials)}</div><div><h2>Account settings</h2><p>${escape(role==='admin'?'Admin':'Recruiter')} · ${escape(user.email)}</p></div></div><div class="profile-tabs" role="tablist" aria-label="Account settings">${[['personal','Personal details'],['security','Password & security'],['preferences','Preferences'],['company','Company']].map(([id,label])=>`<button role="tab" aria-selected="${tab===id}" data-tab="${id}">${label}</button>`).join('')}</div><form class="account-form">${fields}${tab==='company'&&role!=='admin'?'<p class="account-note">Company details are managed by your admin.</p>':'<button type="submit" class="account-submit">Save changes</button>'}</form><p role="status" class="account-message" aria-live="polite"></p><button class="account-link profile-signout" id="signout">Sign out of ShiftMate</button>`;
  content.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>renderProfile(button.dataset.tab));
  content.querySelector('#signout').onclick=async()=>{await logout();location.replace('/');};
  bindForm(async data=>{
    if (tab==='security') {
      if(data.get('password')!==data.get('confirm')) throw new Error('Your passwords do not match.');
      await login(user.email,data.get('current'));
      user=await updateUser({password:data.get('password')});
    } else if (tab==='company') company=await request('/api/company',Object.fromEntries(data));
    else {
      const updates=tab==='personal'?{full_name:data.get('name').trim(),phone:data.get('phone').trim(),jobTitle:data.get('jobTitle').trim()}:{theme:data.get('theme'),language:data.get('language')};
      if(tab==='personal'&&!updates.full_name) throw new Error('Enter your full name.');
      user=await updateUser({data:{...preferences,...updates}});
      applyPreferences(user.userMetadata);
    }
    renderProfile(tab);
    message('Your settings have been saved.',true);
  });
  applyPreferences(preferences);
}
try {
  callback = await handleAuthCallback();
  user = await getUser();
  if (user) {
    const account = await request('/api/account');
    role = account.role;
    applyPreferences(user.userMetadata);
    if (role==='admin'||role==='recruiter') company=await request('/api/company');
  }
  if (callback) renderAuth();
  else if (user && (role==='admin'||role==='recruiter')) {
    if (location.pathname.startsWith('/profile')) renderProfile();
    else if (['/recruiter','/team','/activity'].some(path=>location.pathname.startsWith(path))) {
      await showWorkspacePage({user,escape,request});
    } else await openDashboard();
  } else renderAuth(location.pathname.startsWith('/register')?'register':'login');
} catch(error) {
  renderAuth();
  message(error.message);
}
