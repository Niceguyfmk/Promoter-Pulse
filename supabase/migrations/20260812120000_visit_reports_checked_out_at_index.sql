-- Summary report queries (SummaryReportService.getSummary) filter visit_reports
-- by tenant_id + a checked_out_at date range for day/week/month/year periods.
-- The existing indexes (tenant_id, status, started_at desc) and
-- (promoter_user_id, started_at desc) don't cover that range scan, so the
-- query falls back to a full scan as the table grows.
create index if not exists visit_reports_tenant_checked_out_idx
on public.visit_reports(tenant_id, checked_out_at)
where deleted_at is null;
