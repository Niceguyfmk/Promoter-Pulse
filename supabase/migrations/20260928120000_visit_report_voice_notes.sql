-- Promoter voice notes recorded during a visit. Each item mirrors photo_items:
-- { id, name, size, bucket, path, contentType, durationSeconds, createdAt }.
-- Audio lives in the private "visit-report-voice-notes" storage bucket, which the
-- app provisions on first upload (same as "visit-report-photos").
alter table public.visit_reports
  add column if not exists voice_note_items jsonb not null default '[]'::jsonb;
