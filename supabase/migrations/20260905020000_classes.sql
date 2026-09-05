create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_accounts (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  class_code text not null unique
    check (class_code ~ '^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$'),
  join_mode public.class_join_mode not null default 'open',
  join_open boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.classes is
  'A teacher-owned classroom. Never hard-deleted through the product: archived_at is the delete. teacher_id is ON DELETE RESTRICT so removing a teacher account cannot silently take a roster and its progression with it.';

comment on column public.classes.join_open is
  'Lets a teacher close the door mid-lesson without rotating the code.';

-- Only unarchived classes are ever listed, so the index carries the predicate.
create index classes_teacher_active_idx
  on public.classes (teacher_id)
  where archived_at is null;

create trigger set_classes_updated_at
  before update on public.classes
  for each row
  execute function public.set_updated_at ();

-- Ownership is asked exactly once, here, and every other table's policies call
-- this rather than comparing teacher_id themselves. Adding co-teachers later is
-- then a change to this function body instead of a rewrite of every policy.
--
-- security definer is not optional: a security invoker function that selects
-- from public.classes, called from a policy on public.classes, re-enters that
-- policy and recurses until the statement aborts.
create function public.is_class_teacher (p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.teacher_id = auth.uid ()
  );
$$;

revoke execute on function public.is_class_teacher (uuid) from public;
grant execute on function public.is_class_teacher (uuid) to authenticated;

alter table public.classes enable row level security;

create policy "Teachers read their own classes"
  on public.classes
  for select
  to authenticated
  using (public.is_class_teacher (id));

-- INSERT is the one place the helper cannot be used: WITH CHECK runs before the
-- row exists, so a lookup by id would always come back false.
create policy "Teachers create classes they own"
  on public.classes
  for insert
  to authenticated
  with check (teacher_id = auth.uid ());

-- WITH CHECK compares teacher_id directly so a teacher cannot hand their class
-- to somebody else; USING gates the row on current ownership.
create policy "Teachers update their own classes"
  on public.classes
  for update
  to authenticated
  using (public.is_class_teacher (id))
  with check (teacher_id = auth.uid ());

-- No DELETE policy: archiving is the only path available to a client.

-- Supabase grants broad DML on new public tables by default, so narrowing has
-- to start with a revoke or the column list below is a no-op. class_code and
-- teacher_id are deliberately absent -- rotation is an RPC, ownership is fixed.
revoke update on public.classes from authenticated;
grant update (name, join_mode, join_open, archived_at) on public.classes to authenticated;
