import { getDatabase } from '@netlify/database';
import { getUser } from '@netlify/identity';
export { json, isSameOrigin, dateTodayKualaLumpur } from '../lib/shiftmate-common.ts';

export async function isOwner() {
  const user = await getUser();
  return Boolean(user?.roles?.includes('admin'));
}

export async function readState() {
  const { sql } = getDatabase();
  const [row] = await sql`SELECT revision, state FROM shiftmate_workspace WHERE id = 'main'`;
  return row ?? null;
}

export async function saveState(state, revision) {
  const client = await getDatabase().pool.connect();
  try {
    await client.query('BEGIN');
    const previous = await client.query("SELECT state FROM shiftmate_workspace WHERE id = 'main' FOR UPDATE");
    const before = previous.rows[0]?.state;
    const data = JSON.stringify(state);
    const result = revision === null
      ? await client.query("INSERT INTO shiftmate_workspace (id, revision, state) VALUES ('main', 1, $1::jsonb) ON CONFLICT DO NOTHING RETURNING revision", [data])
      : await client.query("UPDATE shiftmate_workspace SET revision = revision + 1, state = $1::jsonb, updated_at = now() WHERE id = 'main' AND revision = $2 RETURNING revision", [data, revision]);
    if (result.rows.length) {
      const actor = await getUser();
      const role = actor?.roles?.includes('admin') ? 'admin' : actor?.roles?.includes('recruiter') ? 'recruiter' : 'worker';
      const changedBookings = (state.bookings || []).filter(booking =>
        JSON.stringify(booking) !== JSON.stringify(before?.bookings?.find(item => item.id === booking.id)));
      await client.query("INSERT INTO shiftmate_audit (actor_id, actor_email, actor_role, action, agency_id, details) VALUES ($1,$2,$3,$4,$5,$6::jsonb)",
        [actor?.id || null, actor?.email || null, role, role === 'worker' ? 'Worker registration' : 'Workspace updated',
         role === 'recruiter' ? actor.appMetadata?.agency_id : null,
         JSON.stringify({bookings: changedBookings.map(item => ({id:item.id,status:item.status,workerRef:item.workerRef,agencyId:item.agencyId})), workerCount:state.workers.length})]);
    }
    await client.query('COMMIT');
    return result.rows.length === 1;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
