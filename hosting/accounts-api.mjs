import { getUser, admin } from '@netlify/identity';
import { getDatabase } from '@netlify/database';
import { readState, saveState } from './runtime.mjs';
import { json, isSameOrigin } from '../lib/shiftmate-common.ts';

export async function accounts(request) {
  let user = await getUser();
  if (!user) return json({error:'Sign in to continue.'},401);
  user = await admin.getUser(user.id);
  const isAdmin = user.roles?.includes('admin');
  const isRecruiter = user.roles?.includes('recruiter');
  const path = new URL(request.url).pathname;
  if (request.method !== 'GET' && !isSameOrigin(request)) return json({error:'Request origin was rejected.'},403);
  if (path === '/api/session' && request.method === 'POST') {
    const {sql} = getDatabase();
    await sql`INSERT INTO shiftmate_audit (actor_id,actor_email,actor_role,action,agency_id) VALUES (${user.id},${user.email},${isAdmin?'admin':isRecruiter?'recruiter':'member'},'Signed in',${user.appMetadata?.agency_id||null})`;
    return json({saved:true});
  }
  if (path === '/api/account'  && request.method === 'GET') {
    return json({role:isAdmin?'admin':isRecruiter?'recruiter':'member',agencyId:user.appMetadata?.agency_id});
  }
  if (path === '/api/company') {
    if (!isAdmin && !isRecruiter) return json({error:'Workspace access required.'},403);
    const workspace = await readState();
    if (request.method === 'GET') return json(workspace?.state.settings?.company || {});
    if (!isAdmin || request.method !== 'POST') return json({error:'Admin access required.'},403);
    const data = await request.json();
    const company = {};
    for (const key of ['name','phone','address','website']) {
      if (typeof data[key] !== 'string' || data[key].length > 250) return json({error:'Check the company details.'},400);
      company[key] = data[key].trim();
    }
    if (!company.name) return json({error:'Enter the company name.'},400);
    workspace.state.settings.company = company;
    return await saveState(workspace.state,workspace.revision) ? json(company) : json({error:'Workspace changed. Try again.'},409);
  }
  if (path === '/api/activity'  && request.method === 'GET') {
    if (!isAdmin) return json({error:'Admin access required.'},403);
    const {sql} = getDatabase();
    return json(await sql`SELECT * FROM shiftmate_audit ORDER BY id DESC LIMIT 200`);
  }
  if (path === '/api/team') {
    if (!isAdmin) return json({error:'Admin access required.'},403);
    if (request.method === 'GET') {
      const page = Math.max(1,Number(new URL(request.url).searchParams.get('page'))||1);
      const users = await admin.listUsers({page,perPage:50});
      return json(users.map(person=>({id:person.id,email:person.email,name:person.name,roles:person.roles,agencyId:person.appMetadata?.agency_id,lastSignIn:person.lastSignInAt})));
    }
    if (request.method !== 'POST') return json({error:'Unsupported method.'},405);
    const data = await request.json();
    const current = await readState();
    if (!current?.state.agencies.some(agency=>agency.id===data.agencyId && agency.active)) return json({error:'Select an active agency.'},400);
    let person;
    if (data.id) {
      person = await admin.getUser(data.id);
      if (person.roles?.includes('admin')) return json({error:'Admin accounts cannot be changed here.'},403);
      person = await admin.updateUser(data.id,{app_metadata:{...person.appMetadata,roles:data.active===false?[]:['recruiter'],agency_id:data.agencyId}});
    } else {
      if (typeof data.email!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || typeof data.password!=='string' || data.password.length<12 || typeof data.name!=='string' || !data.name.trim()) return json({error:'Enter a name, valid email and password of at least 12 characters.'},400);
      person = await admin.createUser({email:data.email.trim(),password:data.password,data:{app_metadata:{roles:['recruiter'],agency_id:data.agencyId},user_metadata:{full_name:data.name.trim().slice(0,80)}}});
    }
    const {sql} = getDatabase();
    await sql`INSERT INTO shiftmate_audit (actor_id,actor_email,actor_role,action,agency_id,details) VALUES (${user.id},${user.email},'admin','Recruiter access updated',${data.agencyId},${JSON.stringify({email:person.email})}::jsonb)`;
    return json({id:person.id});
  }
  if (path === '/api/recruiter') {
    if (!isAdmin && !isRecruiter) return json({error:'Recruiter access required.'},403);
    // Load server-managed metadata so an agency change or revoked role takes effect immediately.
    const currentUser = await admin.getUser(user.id);
    if (!currentUser.roles?.includes('admin') && !currentUser.roles?.includes('recruiter')) return json({error:'Recruiter access has been removed.'},403);
    const agencyId = currentUser.appMetadata?.agency_id;
    if (!isAdmin && !agencyId) return json({error:'Ask your admin to assign your agency.'},403);
    const workspace = await readState();
    if (!workspace) return json({error:'Workspace is unavailable.'},503);
    const state = workspace.state;
    if (request.method === 'GET') return json({
      workers:state.workers.filter(item=>isAdmin || item.agencyId===agencyId),
      bookings:state.bookings.filter(item=>isAdmin || item.agencyId===agencyId),
      agencies:state.agencies.filter(item=>isAdmin || item.id===agencyId),
      warehouses:state.warehouses.map(({id,name})=>({id,name}))
    });
    if (request.method !== 'POST') return json({error:'Unsupported method.'},405);
    const data = await request.json();
    const booking = state.bookings.find(item=>item.id===data.id && (isAdmin || item.agencyId===agencyId));
    if (!booking) return json({error:'Booking was not found.'},404);
    if (!['confirmed','cancelled','completed'].includes(data.status)) return json({error:'Invalid booking status.'},400);
    const transitions = {pending:['confirmed','cancelled'],confirmed:['completed','cancelled']};
    if (!transitions[booking.status]?.includes(data.status)) return json({error:'That status change is unavailable.'},409);
    booking.status = data.status;
    const saved = await saveState(state,workspace.revision);
    return saved ? json({saved:true}) : json({error:'The booking changed. Refresh and try again.'},409);
  }
  return json({error:'Page not found.'},404);
}
