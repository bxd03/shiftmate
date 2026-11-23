import { env } from "cloudflare:workers";
import { headers } from "next/headers";

import type { WorkspaceState } from "./shiftmate-common";
export * from "./shiftmate-common";

export function database() {
  if (!env.DB) throw new Error("Shiftmate shared storage is not connected yet.");
  return env.DB;
}

export async function isOwner() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const ownerIdMatches = Boolean(userId && env.SHIFTMATE_OWNER_ID && userId === env.SHIFTMATE_OWNER_ID);
  const ownerEmailMatches = Boolean(email && env.SHIFTMATE_OWNER_EMAIL && email === env.SHIFTMATE_OWNER_EMAIL.trim().toLowerCase());
  return ownerIdMatches || ownerEmailMatches;
}

export async function readState() {
  const row = await database().prepare("SELECT revision, state_json FROM shiftmate_workspace_state WHERE id = ?1").bind("main").first<{ revision: number; state_json: string }>();
  if (!row) return null;
  return { revision: Number(row.revision), state: JSON.parse(row.state_json) as WorkspaceState };
}

export async function saveState(state: WorkspaceState, revision: number | null) {
  const db = database();
  const result = revision === null
    ? await db.prepare("INSERT OR IGNORE INTO shiftmate_workspace_state (id, revision, state_json, updated_at) VALUES ('main', 1, ?1, CURRENT_TIMESTAMP)").bind(JSON.stringify(state)).run()
    : await db.prepare("UPDATE shiftmate_workspace_state SET revision = revision + 1, state_json = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 'main' AND revision = ?2").bind(JSON.stringify(state), revision).run();
  return result.meta.changes > 0;
}
