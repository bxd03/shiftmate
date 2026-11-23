import { getDatabase } from '@netlify/database';
import { getUser } from '@netlify/identity';
export { json, isSameOrigin, dateTodayKualaLumpur } from '../lib/shiftmate-common.ts';

export async function isOwner() {
  const user = await getUser();
  return Boolean(user?.roles.includes('admin'));
}

export async function readState() {
  const { sql } = getDatabase();
  const [row] = await sql`SELECT revision, state FROM shiftmate_workspace WHERE id = 'main'`;
  return row ?? null;
}

export async function saveState(state, revision) {
  const { sql } = getDatabase();
  const data = JSON.stringify(state);
  const rows = revision === null
    ? await sql`INSERT INTO shiftmate_workspace (id, revision, state) VALUES ('main', 1, ${data}::jsonb) ON CONFLICT DO NOTHING RETURNING revision`
    : await sql`UPDATE shiftmate_workspace SET revision = revision + 1, state = ${data}::jsonb, updated_at = now() WHERE id = 'main' AND revision = ${revision} RETURNING revision`;
  return rows.length === 1;
}
