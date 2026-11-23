import { saveState, isOwner, isSameOrigin, json, readState, type WorkspaceState } from "../../../lib/shiftmate-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOwner())) return json({ error: "Admin access required." }, 403);
  try { return json(await readState()); }
  catch { return json({ error: "Shared storage is unavailable." }, 503); }
}

export async function PUT(request: Request) {
  if (!(await isOwner())) return json({ error: "Admin access required." }, 403);
  if (!isSameOrigin(request)) return json({ error: "Request origin was rejected." }, 403);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 2_000_000) return json({ error: "Workspace update is too large." }, 413);
  let payload: { revision: number | null; state: WorkspaceState };
  try { payload = await request.json() as typeof payload; }
  catch { return json({ error: "Invalid workspace update." }, 400); }
  const state = payload?.state;
  if (!state || !Array.isArray(state.agencies) || !Array.isArray(state.warehouses) || !Array.isArray(state.workers) || !Array.isArray(state.bookings) || !state.quotas || !state.settings) return json({ error: "Workspace data is incomplete." }, 400);
  if (state.workers.length > 10000 || state.bookings.length > 50000 || JSON.stringify(state).length > 1_900_000) return json({ error: "Workspace data exceeds its size limit." }, 413);
  try {
    if (payload.revision === null) {
      const inserted = await saveState(state, null);
      const current = await readState();
      if (!current) return json({ error: "Could not initialize the workspace." }, 503);
      return json(current, inserted ? 201 : 409);
    }
    if (!Number.isSafeInteger(payload.revision) || payload.revision < 1) return json({ error: "Workspace revision is invalid." }, 400);
    const saved = await saveState(state, payload.revision);
    if (!saved) return json({ error: "Workspace changed on another device. Reload the latest data and try again." }, 409);
    return json({ revision: payload.revision + 1, state });
  } catch { return json({ error: "Could not save the shared workspace." }, 503); }
}
