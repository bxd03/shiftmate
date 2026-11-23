import { json, readState, dateTodayKualaLumpur } from "../../../../lib/shiftmate-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "";
  const warehouseId = url.searchParams.get("warehouseId") || "";
  const shiftId = url.searchParams.get("shiftId") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !warehouseId || !["day", "night"].includes(shiftId)) return json({ error: "Choose a valid date, warehouse and shift." }, 400);
  try {
    const workspace = await readState();
    if (!workspace) return json({ error: "Shiftmate sign-up is not ready yet." }, 503);
    const state = workspace.state;
    const warehouse = state.warehouses.find(w => w.id === warehouseId && w.active && w.shifts.includes(shiftId));
    if (!warehouse) return json({ error: "That shift is not available at this warehouse." }, 404);
    const today = dateTodayKualaLumpur();
    if (date < today || date > new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10)) return json({ error: "Choose a date within the next 30 days." }, 400);
    const agencies = state.agencies.filter(a => a.active).map(a => {
      const key = [date, warehouseId, shiftId, a.id].join("|");
      const quota = Number(state.quotas?.[key] ?? a.defaultQuota ?? 0);
      const booked = state.bookings.filter(b => b.date === date && b.warehouseId === warehouseId && b.shiftId === shiftId && b.agencyId === a.id && ["confirmed", "pending"].includes(b.status)).length;
      return { id: a.id, name: a.name, status: booked < quota ? "Open" : "Full" };
    });
    return json({ agencies });
  } catch { return json({ error: "Could not check shift availability." }, 503); }
}
