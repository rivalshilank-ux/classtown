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
