-- Visits left open past the end of their check-in day are closed at 23:59:59
-- (in p_time_zone) and marked rejected with an explanatory review note, so
-- the visit timer no longer keeps running for days. Called lazily by the app
-- (service role) whenever open visits are read; idempotent.
create or replace function public.close_stale_visit_reports(p_time_zone text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  closed_count integer;
begin
  update public.visit_reports
  set
    status = 'rejected',
    checked_out_at = ((started_at at time zone p_time_zone)::date + 1)::timestamp at time zone p_time_zone - interval '1 second',
    review_note = 'Auto-closed: visit was not checked out by the end of the day.',
    reviewed_by_user_id = null,
    reviewed_at = now(),
    updated_at = now()
  where status = 'draft'
    and checked_out_at is null
    and deleted_at is null
    and (started_at at time zone p_time_zone)::date < (now() at time zone p_time_zone)::date;

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

revoke all on function public.close_stale_visit_reports(text) from public, anon, authenticated;
grant execute on function public.close_stale_visit_reports(text) to service_role;
