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

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function dateTodayKualaLumpur() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
