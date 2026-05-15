drop policy if exists "promoters can update own draft visit reports" on public.visit_reports;
create policy "promoters can update own draft or rejected visit reports"
on public.visit_reports for update
using (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
  and status in ('draft', 'rejected')
  and deleted_at is null
)
with check (
  tenant_id = public.current_app_tenant_id()
  and promoter_user_id = public.current_app_user_id()
  and status in ('draft', 'submitted', 'rejected')
);
