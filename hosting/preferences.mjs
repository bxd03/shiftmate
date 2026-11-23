const translations = {
'Welcome back':'Selamat kembali','Sign in':'Log masuk','Sign in →':'Log masuk →','Email address':'Alamat e-mel','Password':'Kata laluan','Forgot password?':'Lupa kata laluan?','Profile settings':'Tetapan profil','Manage your account details':'Urus butiran akaun anda','Personal details':'Butiran peribadi','Password & security':'Kata laluan & keselamatan','Preferences':'Pilihan','Company':'Syarikat','Full name':'Nama penuh','Save changes':'Simpan perubahan','Current password':'Kata laluan semasa','New password':'Kata laluan baharu','Confirm new password':'Sahkan kata laluan baharu','Update password':'Kemas kini kata laluan','Theme':'Tema','Language':'Bahasa','Light':'Cerah','Dark':'Gelap','System':'Sistem','Company name':'Nama syarikat','Phone number':'Nombor telefon','Job title':'Jawatan','Time zone':'Zon waktu','Sign out of ShiftMate':'Log keluar daripada ShiftMate','← Back to workspace':'← Kembali ke ruang kerja','Sign out':'Log keluar','Overview':'Gambaran keseluruhan','Shift bookings':'Tempahan syif','Workers':'Pekerja','Agencies':'Agensi','Warehouses':'Gudang','Worker sign-up':'Pendaftaran pekerja','Shift plan':'Pelan syif','Attendance':'Kehadiran','Cancellation reviews':'Semakan pembatalan','Reports':'Laporan','Rules & settings':'Peraturan & tetapan','Recruiter login':'Log masuk perekrut','Recruiter workspace':'Ruang kerja perekrut','Team access':'Akses pasukan','Activity log':'Log aktiviti','Worker registration ↗':'Pendaftaran pekerja ↗','Create account':'Cipta akaun','Join your workspace':'Sertai ruang kerja anda','Back to sign in':'Kembali ke log masuk','Set up your account':'Sediakan akaun anda','Your details':'Butiran anda','Warehouse worker ID':'ID pekerja gudang','Agency':'Agensi','Warehouse':'Gudang','Working time':'Waktu bekerja','Shift date':'Tarikh syif','Request this shift':'Mohon syif ini','Refresh':'Muat semula','Create recruiter':'Cipta perekrut','Agency assignment':'Penempatan agensi','Account settings':'Tetapan akaun'
};
const originals = new WeakMap();
let current = {};
let observing = false;
export function translate() {
  if (document.documentElement.lang !== 'ms') return;
  const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (['SCRIPT','STYLE','OPTION'].includes(node.parentElement?.tagName)) continue;
    const source = originals.get(node) || node.textContent;
    const replacement = translations[source.trim()];
    if (replacement && node.textContent !== replacement) {
      originals.set(node,source);
      node.textContent = replacement;
    }
  }
}
export function applyPreferences(preferences = {}) {
  current = preferences;
  const theme = preferences.theme || 'system';
  const dark = theme === 'dark' || theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.lang = preferences.language === 'ms' ? 'ms' : 'en';
  localStorage.setItem('shiftmate-preferences',JSON.stringify({theme,language:preferences.language||'en'}));
  if (preferences.language !== 'ms') {
    const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (originals.has(node)) node.textContent = originals.get(node);
    }
  } else translate();
  if (!observing) {
    observing = true;
    new MutationObserver(()=>translate()).observe(document.body,{childList:true,subtree:true,characterData:true});
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>applyPreferences(current));
  }
}
