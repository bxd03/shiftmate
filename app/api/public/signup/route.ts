import { saveState, isSameOrigin, json, readState, dateTodayKualaLumpur, type WorkspaceState } from "../../../../lib/shiftmate-api";

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nextId(state: WorkspaceState) { return `BK-${Math.max(1000, ...state.bookings.map(b => Number(String(b.id).split("-")[1]) || 0)) + 1}`; }

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Request origin was rejected." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 12000) return json({ error: "Sign-up details are too large." }, 413);
  let payload: Record<string, unknown>;
  try { payload = await request.json() as Record<string, unknown>; } catch { return json({ error: "Invalid sign-up details." }, 400); }
  if (clean(payload.website, 200)) return json({ error: "Sign-up could not be accepted." }, 400);
  const workerType = payload.workerType === "new" ? "new" : "existing";
  const name = clean(payload.name, 70);
  const workerId = clean(payload.workerId, 24);
  const phone = clean(payload.phone, 20);
  const agencyId = clean(payload.agencyId, 100);
  const warehouseId = clean(payload.warehouseId, 100);
  const shiftId = clean(payload.shiftId, 10);
  const date = clean(payload.date, 10);
  if (name.length < 2 || phone.replace(/\D/g, "").length < 8 || !agencyId || !warehouseId || !["day", "night"].includes(shiftId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (workerType === "existing" && workerId.length < 3)) return json({ error: "Complete each required field with valid details." }, 400);
  const today = dateTodayKualaLumpur();
  const maxDate = new Date(`${today}T12:00:00+08:00`); maxDate.setDate(maxDate.getDate() + 30);
  if (date < today || date > maxDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" })) return json({ error: "Choose a shift date within the next 30 days." }, 400);

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await readState();
      if (!current) return json({ error: "Shiftmate is not ready for sign-ups yet. Please contact the agency PIC." }, 503);
      const state = current.state;
      const agency = state.agencies.find(a => a.id === agencyId && a.active);
      const warehouse = state.warehouses.find(w => w.id === warehouseId && w.active && w.shifts.includes(shiftId));
      if (!agency || !warehouse) return json({ error: "Choose an active agency and an available warehouse shift." }, 400);
      let worker = workerType === "existing" ? state.workers.find(w => w.workerId.toLowerCase() === workerId.toLowerCase()) : undefined;
      if (worker?.banned) return json({ error: "This worker ID is blocked. Contact your agency PIC." }, 403);
      if (worker && worker.agencyId !== agencyId) return json({ error: "That worker ID belongs to another agency. Ask the PIC to check the worker record." }, 403);
      if (workerType === "existing" && (!worker || worker.phone.replace(/\D/g, "") !== phone.replace(/\D/g, ""))) return json({ error: "Check your registered worker ID and phone number." }, 400);
      const effectiveWorkerId = worker?.workerId || (workerType === "existing" ? workerId : "");
      const duplicate = worker && state.bookings.some(b => b.workerRef === worker!.id && b.date === date && b.shiftId === shiftId && ["confirmed", "pending", "completed"].includes(b.status));
      if (duplicate) return json({ error: "You already have a request or booking for this shift." }, 409);
      if (effectiveWorkerId && !worker) worker = state.workers.find(w => w.workerId.toLowerCase() === effectiveWorkerId.toLowerCase());
      if (!worker && workerType === "new" && state.workers.some(w => w.phone.replace(/\D/g, "") === phone.replace(/\D/g, "") && w.agencyId === agencyId)) return json({ error: "This phone number is already registered with the agency. Choose returning worker and enter your worker ID." }, 409);
      const quotaKey = [date, warehouseId, shiftId, agencyId].join("|");
      const quota = Number(state.quotas?.[quotaKey] ?? agency.defaultQuota ?? 0);
      const booked = state.bookings.filter(b => b.date === date && b.warehouseId === warehouseId && b.shiftId === shiftId && b.agencyId === agencyId && ["confirmed", "pending"].includes(b.status)).length;
      if (booked >= quota) return json({ error: "This agency is full for that shift. Try another date, warehouse or shift." }, 409);
      if (!worker) {
        let generatedId = effectiveWorkerId;
        if (workerType === "new") { do { generatedId = `SH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; } while (state.workers.some(w => w.workerId === generatedId)); }
        worker = { id: `w-${crypto.randomUUID()}`, name, workerId: generatedId, agencyId, phone, isNew: workerType === "new", banned: false, joined: today };
        state.workers.push(worker);
      }
      const bookingId = nextId(state);
      state.bookings.unshift({ id: bookingId, workerRef: worker.id, agencyId, warehouseId, shiftId, date, status: "pending", createdAt: Date.now(), lateCancel: false, attendance: "unmarked" });
      state.activity = state.activity || [];
      state.activity.unshift({ message: `${worker.name} requested ${shiftId === "day" ? "Day shift" : "Night shift"} at ${warehouse.name}`, type: "booked", time: Date.now() });
      state.activity = state.activity.slice(0, 12);
      const saved = await saveState(state, current.revision);
      if (saved) return json({ bookingId, workerId: worker.workerId, status: "Pending" }, 201);
    }
    return json({ error: "The schedule changed while you were signing up. Please check availability and submit again." }, 409);
  } catch { return json({ error: "Shiftmate could not save this request. Please try again or contact your agency PIC." }, 503); }
}
