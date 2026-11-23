CREATE TABLE shiftmate_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text,
  actor_email text,
  actor_role text NOT NULL,
  action text NOT NULL,
  agency_id text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON shiftmate_audit (created_at DESC);
