alter table public.visit_reports
  add column if not exists checkin_lat numeric(9, 6),
  add column if not exists checkin_lng numeric(9, 6),
  add column if not exists checkin_accuracy numeric(8, 2),
  add column if not exists checkin_at timestamptz,
  add column if not exists checkin_distance_meters numeric(10, 2);

