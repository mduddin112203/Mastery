-- Admin MVP support: role-based admin reads, report resolution fields, and helper indexes.

alter table public.reports
  add column if not exists status text not null default 'open' check (status in ('open', 'resolved')),
  add column if not exists resolved_at timestamptz null,
  add column if not exists resolved_by uuid null references public.profiles(id) on delete set null;

-- Profiles: admins can read all profiles for user monitoring.
create policy "admins read all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- User settings: admins can read all settings.
create policy "admins read all settings" on public.user_settings
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Attempts: admins can read all attempts for analytics.
create policy "admins read all attempts" on public.attempts
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Reports: admins can read all and update status.
create policy "admins read all reports" on public.reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins update reports" on public.reports
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Helper indexes for admin analytics/moderation queries.
create index if not exists idx_reports_status_created_at on public.reports (status, created_at desc);
create index if not exists idx_attempts_question_created_at on public.attempts (question_id, created_at desc);
create index if not exists idx_attempts_created_at on public.attempts (created_at desc);
