import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export type WorkspaceState = {
  agencies: Array<{ id: string; name: string; pic?: string; phone?: string; defaultQuota?: number; tone?: string; active: boolean }>;
  warehouses: Array<{ id: string; name: string; city?: string; code?: string; active: boolean; shifts: string[] }>;
  workers: Array<{ id: string; name: string; workerId: string; agencyId: string; phone: string; banned?: boolean; banReason?: string; [key: string]: unknown }>;
  bookings: Array<{ id: string; workerRef: string; agencyId: string; warehouseId: string; shiftId: string; date: string; status: string; createdAt: number; [key: string]: unknown }>;
  quotas: Record<string, number>;
  settings: { cancelWindow?: number; requireReason?: boolean; whatsappAlerts?: boolean; [key: string]: unknown };
  activity?: Array<{ message: string; type: string; time: number }>;
  [key: string]: unknown;
};

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

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function readState() {
  const row = await database().prepare("SELECT revision, state_json FROM shiftmate_workspace_state WHERE id = ?1").bind("main").first<{ revision: number; state_json: string }>();
  if (!row) return null;
  return { revision: Number(row.revision), state: JSON.parse(row.state_json) as WorkspaceState };
}

export function dateTodayKualaLumpur() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
