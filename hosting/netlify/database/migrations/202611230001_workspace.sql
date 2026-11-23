CREATE TABLE shiftmate_workspace (
  id text PRIMARY KEY,
  revision integer NOT NULL CHECK (revision > 0),
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO shiftmate_workspace (id, revision, state)
VALUES ('main', 1, '{"agencies":[],"warehouses":[],"workers":[],"bookings":[],"quotas":{},"activity":[],"settings":{"cancelWindow":90,"requireReason":true,"whatsappAlerts":false}}');
CREATE VIEW shiftmate_registrations AS
SELECT booking->>'id' AS booking_id, booking->>'status' AS status,
       booking->>'date' AS shift_date, booking->>'shiftId' AS shift,
       booking->>'warehouseId' AS warehouse_id, worker->>'agencyId' AS agency_id,
       worker->>'workerId' AS worker_id, worker->>'name' AS worker_name, worker->>'phone' AS phone
FROM shiftmate_workspace w
CROSS JOIN LATERAL jsonb_array_elements(w.state->'bookings') AS booking
JOIN LATERAL jsonb_array_elements(w.state->'workers') AS worker ON worker->>'id' = booking->>'workerRef';
