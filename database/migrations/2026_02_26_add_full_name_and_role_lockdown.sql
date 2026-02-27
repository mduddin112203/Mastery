alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.profiles
  alter column first_name set default '',
  alter column last_name set default '',
  alter column first_name set not null,
  alter column last_name set not null;

-- =========================
-- 2) Update signup trigger function to pull from metadata
--    Supabase signup should send:
--    options.data = { first_name: "...", last_name: "..." }
-- =========================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Make sure the trigger exists and is attached (safe re-create)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================
-- 3) Backfill existing users (optional but recommended)
--    Copies metadata into profiles where names are missing/empty
-- =========================
update public.profiles p
set
  first_name = coalesce(nullif(p.first_name, ''), coalesce(u.raw_user_meta_data->>'first_name', '')),
  last_name  = coalesce(nullif(p.last_name,  ''), coalesce(u.raw_user_meta_data->>'last_name',  ''))
from auth.users u
where u.id = p.id
  and (
    p.first_name is null or p.first_name = '' or
    p.last_name  is null or p.last_name  = ''
  );


-- =========================
-- 4) RLS: prevent users from changing their own role
--    Allow users to update their own name fields.
--    Allow admins to change role for NON-admin users only.
-- =========================

-- Replace the overly-permissive user update policy if it exists
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users update own profile (no role change)" on public.profiles;

-- Users can update their own profile row, but role must remain unchanged.
create policy "users update own profile (no role change)" on public.profiles
for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select p.role from public.profiles p where p.id = auth.uid())
);

-- Admin role-change policy:
-- Admins can update profiles, but they cannot change roles on rows that are currently admin.
drop policy if exists "admins update roles for non-admin users" on public.profiles;

create policy "admins update roles for non-admin users" on public.profiles
for update
using (
  exists (
    select 1 from public.profiles me
    where me.id = auth.uid() and me.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles me
    where me.id = auth.uid() and me.role = 'admin'
  )
  -- target row must not currently be an admin (blocks changing other admins)
  and (select target.role from public.profiles target where target.id = public.profiles.id) <> 'admin'
);