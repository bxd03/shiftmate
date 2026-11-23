export async function showWorkspacePage({user,escape,request}) {
  const recruiter = location.pathname.startsWith('/recruiter');
  const activity = location.pathname.startsWith('/activity');
  const title = recruiter ? 'Recruiter workspace' : activity ? 'Activity log' : 'Team access';
  const root = document.body;
  root.innerHTML = `<link rel="stylesheet" href="/account.css"><main class="management-page"><header><a href="/" class="account-brand">shiftmate</a><nav><a href="/profile/">Profile settings</a> · <a href="/">Workspace</a></nav></header><h1>${title}</h1><p id="pageStatus" role="status"></p><section id="pageData"></section></main>`;
  const status = root.querySelector('#pageStatus');
  const panel = root.querySelector('#pageData');
  async function load() {
    try {
      if (activity) {
        const rows = await request('/api/activity');
        panel.innerHTML = '<p>Recent worker registrations and workspace changes, newest first.</p><div class="scroll-table"><table><thead><tr><th>When</th><th>Role</th><th>Account</th><th>Activity</th><th>Details</th></tr></thead><tbody>'+rows.map(row=>`<tr><td>${escape(new Date(row.created_at).toLocaleString())}</td><td>${escape(row.actor_role)}</td><td>${escape(row.actor_email||'Public worker form')}</td><td>${escape(row.action)}</td><td>${escape(JSON.stringify(row.details))}</td></tr>`).join('')+'</tbody></table></div>';
        if (!rows.length) panel.innerHTML += '<p>Activity will appear here as people use ShiftMate.</p>';
      } else if (recruiter) {
        const data = await request('/api/recruiter');
        const workers = new Map(data.workers.map(item=>[item.id,item]));
        panel.innerHTML = `<p>${data.workers.length} workers · ${data.bookings.length} bookings</p><button id="refresh" class="btn">Refresh</button><div class="scroll-table"><table><thead><tr><th>Worker</th><th>Phone</th><th>Date</th><th>Warehouse</th><th>Shift</th><th>Status</th><th>Review</th></tr></thead><tbody>${data.bookings.map(item=>`<tr><td>${escape(workers.get(item.workerRef)?.name)}</td><td>${escape(workers.get(item.workerRef)?.phone)}</td><td>${escape(item.date)}</td><td>${escape(data.warehouses.find(w=>w.id===item.warehouseId)?.name)}</td><td>${escape(item.shiftId)}</td><td>${escape(item.status)}</td><td>${(item.status==='pending'?['confirmed','cancelled']:item.status==='confirmed'?['completed','cancelled']:[]).map(next=>`<button class="btn btn-small" data-id="${escape(item.id)}" data-status="${next}">${next==='confirmed'?'Confirm':next==='completed'?'Complete':'Cancel'}</button>`).join(' ')}</td></tr>`).join('')}</tbody></table></div><h2>Worker directory</h2><div class="scroll-table"><table><thead><tr><th>Name</th><th>Worker ID</th><th>Phone</th></tr></thead><tbody>${data.workers.map(w=>`<tr><td>${escape(w.name)}</td><td>${escape(w.workerId)}</td><td>${escape(w.phone)}</td></tr>`).join('')}</tbody></table></div>`;
        panel.querySelector('#refresh').onclick = load;
        panel.querySelectorAll('[data-id]').forEach(button=>button.onclick=async()=>{
          button.disabled=true;
          try { await request('/api/recruiter',{id:button.dataset.id,status:button.dataset.status}); await load(); status.textContent='Booking updated.'; }
          catch(error) {status.textContent=error.message;button.disabled=false;}
        });
      } else {
        const data = await request('/api/state');
        const people = await request('/api/team?page='+page);
        const agencies = data.state.agencies.filter(item=>item.active);
        const options = agencies.map(a=>`<option value="${escape(a.id)}">${escape(a.name)}</option>`).join('');
        panel.innerHTML = `<p>Create recruiter accounts and assign each person to an agency.</p><form class="account-form team-form"><label class="account-field">Full name<input name="name" maxlength="80" required></label><label class="account-field">Email address<input name="email" type="email" required></label><label class="account-field">Initial password<input name="password" type="password" minlength="12" autocomplete="new-password" required><small>At least 12 characters. Share credentials directly with the recruiter, who can change the password in settings.</small></label><label class="account-field">Agency assignment<select name="agencyId" required>${options}</select></label><button class="account-submit" type="submit" ${agencies.length?'':'disabled'}>Create recruiter</button></form>${agencies.length?'':'<p>Add an active agency in the workspace before creating recruiters.</p>'}<h2>Accounts</h2><div class="scroll-table"><table><thead><tr><th>Account</th><th>Role</th><th>Agency assignment</th><th>Last sign-in</th><th>Access</th></tr></thead><tbody>${people.map(person=>`<tr><td>${escape(person.name||person.email)}<small>${escape(person.email)}</small></td><td>${escape(person.roles?.join(', ')||'Inactive')}</td><td>${person.roles?.includes('admin')?'All agencies':`<select data-agency="${escape(person.id)}">${agencies.map(a=>`<option value="${escape(a.id)}" ${a.id===person.agencyId?'selected':''}>${escape(a.name)}</option>`).join('')}</select>`}</td><td>${person.lastSignIn?escape(new Date(person.lastSignIn).toLocaleString()):'No sign-in yet'}</td><td>${person.roles?.includes('admin')?'Workspace owner':`<button class="btn" data-person="${escape(person.id)}" data-active="true">Save assignment</button> <button class="btn" data-person="${escape(person.id)}" data-active="${!person.roles?.includes('recruiter')}">${person.roles?.includes('recruiter')?'Remove access':'Enable access'}</button>`}</td></tr>`).join('')}</tbody></table></div><button id="prev" class="btn" ${page===1?'disabled':''}>Previous</button> <span>Page ${page}</span> <button id="next" class="btn" ${people.length<50?'disabled':''}>Next</button>`;
        panel.querySelector('#prev').onclick=()=>{page--;load();};
        panel.querySelector('#next').onclick=()=>{page++;load();};
        panel.querySelector('form').onsubmit=async event=>{
          event.preventDefault();
          const button=event.target.querySelector('button');button.disabled=true;
          try {await request('/api/team',Object.fromEntries(new FormData(event.target)));await load();status.textContent='Recruiter account created. Share the recruiter login link with them.';}
          catch(error){status.textContent=error.message;button.disabled=false;}
        };
        panel.querySelectorAll('[data-person]').forEach(button=>button.onclick=async()=>{
          button.disabled=true;
          const select=Array.from(panel.querySelectorAll('[data-agency]')).find(item=>item.dataset.agency===button.dataset.person);
          try {await request('/api/team',{id:button.dataset.person,agencyId:select.value,active:button.dataset.active==='true'});await load();status.textContent='Recruiter access saved.';}
          catch(error){status.textContent=error.message;button.disabled=false;}
        });
      }
    } catch(error) {status.textContent=error.message;}
  }
  let page=1;
  await load();
}
