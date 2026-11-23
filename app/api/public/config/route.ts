import { dateTodayKualaLumpur, json, readState } from "../../../../lib/shiftmate-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workspace = await readState();
    if (!workspace) return json({ error: "Shiftmate is being set up. Please try again shortly." }, 503);
    const state = workspace.state;
    return json({
      settings: { cancelWindow: Number(state.settings?.cancelWindow ?? 90) },
      agencies: state.agencies.filter(a => a.active).map(a => ({ id: a.id, name: a.name })),
      warehouses: state.warehouses.filter(w => w.active).map(w => ({ id: w.id, name: w.name, city: w.city, shifts: w.shifts })),
      today: dateTodayKualaLumpur(),
    });
  } catch { return json({ error: "Shared storage is unavailable. Please try again shortly." }, 503); }
}
