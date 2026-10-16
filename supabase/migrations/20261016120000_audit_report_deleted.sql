-- Allows deleted reports (single and bulk) to be recorded in public.audit_logs.
alter type public.audit_action add value if not exists 'report.deleted';
