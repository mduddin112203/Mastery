-- Fix RLS recursion on public.profiles policies.
-- Root cause: policies queried public.profiles from inside policies on public.profiles.

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

drop policy if exists "admins read all profiles" on public.profiles;
drop policy if exists "admins update roles for non-admin users" on public.profiles;
drop policy if exists "users update own profile (no role change)" on public.profiles;

create policy "users update own profile (no role change)" on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "admins read all profiles" on public.profiles
for select
using (public.is_admin_user());

create policy "admins update roles for non-admin users" on public.profiles
for update
using (public.is_admin_user())
with check (public.is_admin_user());

create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not public.is_admin_user() then
      raise exception 'Only admins can change roles';
    end if;

    if old.role = 'admin' then
      raise exception 'Admin roles cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_admin_role_change on public.profiles;
create trigger prevent_non_admin_role_change
before update on public.profiles
for each row execute procedure public.prevent_non_admin_role_change();

-- Also avoid profile-policy dependency chains in admin policies on other tables.
drop policy if exists "admins read all settings" on public.user_settings;
create policy "admins read all settings" on public.user_settings
for select
using (public.is_admin_user());

drop policy if exists "admins read all attempts" on public.attempts;
create policy "admins read all attempts" on public.attempts
for select
using (public.is_admin_user());

drop policy if exists "admins read all reports" on public.reports;
create policy "admins read all reports" on public.reports
for select
using (public.is_admin_user());

drop policy if exists "admins update reports" on public.reports;
create policy "admins update reports" on public.reports
for update
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "admins read all questions" on public.questions;
create policy "admins read all questions" on public.questions
for select
using (public.is_admin_user());

drop policy if exists "admins insert questions" on public.questions;
create policy "admins insert questions" on public.questions
for insert
with check (public.is_admin_user());

drop policy if exists "admins update questions" on public.questions;
create policy "admins update questions" on public.questions
for update
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "admins delete questions" on public.questions;
create policy "admins delete questions" on public.questions
for delete
using (public.is_admin_user());
