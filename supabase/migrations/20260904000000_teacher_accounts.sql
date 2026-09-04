-- Phase 1: teacher profile + auth wiring.
--
-- Teacher identity is Supabase Auth (auth.users) — this table only holds
-- the profile fields the app actually needs (name, school, email mirror).
-- No password or credential data is ever stored here; auth.users is the
-- only place a credential exists.

create table public.teacher_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  school_name text not null,
  email text not null,
  role text not null default 'teacher' check (role = 'teacher'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.teacher_accounts is
  'Teacher profile data. One row per auth.users row, created automatically by handle_new_teacher(). Row Level Security scopes every row to its own owner.';

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- Unauthenticated requests get no access at all (no policy grants
-- anything to the `anon` role). Authenticated teachers can only ever
-- see or change their own row — there is deliberately no policy that
-- lets a teacher read or update another teacher's profile.

alter table public.teacher_accounts enable row level security;

create policy "Teachers can read their own profile"
  on public.teacher_accounts
  for select
  to authenticated
  using (auth.uid () = id);

create policy "Teachers can update their own profile"
  on public.teacher_accounts
  for update
  to authenticated
  using (auth.uid () = id)
  with check (auth.uid () = id);

-- No insert/delete policy for `authenticated`: rows are only ever
-- created by the trigger below (running as the table owner via
-- `security definer`), and are never deleted directly by the app.

-- ---------------------------------------------------------------------
-- Auto-create the profile row when a teacher signs up
-- ---------------------------------------------------------------------
-- apps/web's signUpTeacher Server Action passes `name` / `school_name`
-- via `options.data` on `supabase.auth.signUp()`, which Supabase stores
-- on `raw_user_meta_data`. This trigger reads that back out so the
-- profile exists atomically with the auth user — the app never has to
-- perform a second, separately-failable insert after signUp resolves.
--
-- NOTE for a future phase: if student accounts ever also go through
-- `auth.users`, this trigger will need a way to tell teacher signups
-- apart from student signups (e.g. a `role` value in the signUp
-- metadata) before it can stay unconditional like this.

create function public.handle_new_teacher ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teacher_accounts (id, name, school_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'school_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_teacher ();

-- ---------------------------------------------------------------------
-- Keep updated_at current
-- ---------------------------------------------------------------------

create function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_teacher_accounts_updated_at
  before update on public.teacher_accounts
  for each row
  execute function public.set_updated_at ();
