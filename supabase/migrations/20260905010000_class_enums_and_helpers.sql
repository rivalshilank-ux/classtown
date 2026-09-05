-- Enums, the shared entry-code generator, and a guard on the existing signup
-- trigger. Nothing here depends on a table, so it can run before the rest.

create type public.class_join_mode as enum ('open', 'roster');

comment on type public.class_join_mode is
  'open: the student picks a nickname and the server issues them a participant code. roster: the teacher pre-creates participants and the student claims one by code.';

create type public.participant_status as enum ('active', 'removed', 'transferred');

create type public.activity_event_type as enum ('joined', 'left');

comment on type public.activity_event_type is
  'Discrete, teacher-visible milestones only. Movement and presence are never events. Extend with a dedicated migration -- a new enum value cannot be used in the transaction that adds it.';

-- Supabase already ships pgcrypto in the extensions schema, so both statements
-- are no-ops there. They exist so the migration also applies to a bare Postgres
-- (CI, a local verification database) without installing extension functions
-- into public, where they would leak into the generated database types.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Entry codes are read off a whiteboard by children, so the alphabet excludes
-- every lookalike pair (0/O, 1/I/L) and U. 30 usable characters, 6 places,
-- giving 30^6 = 729,000,000 combinations.
create function public.generate_entry_code ()
returns text
language plpgsql
volatile
set search_path = public, extensions, pg_temp
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  alphabet_len constant integer := 30;
  -- 240 = 8 * 30, so rejecting bytes at or above it removes modulo bias.
  reject_at constant integer := 240;
  result text := '';
  b integer;
  i integer;
begin
  for i in 1 .. 6 loop
    loop
      b := get_byte(gen_random_bytes(1), 0);
      exit when b < reject_at;
    end loop;
    result := result || substr(alphabet, 1 + (b % alphabet_len), 1);
  end loop;

  return result;
end;
$$;

comment on function public.generate_entry_code () is
  'Returns one unbiased 6-character entry code. Callers are responsible for retrying on unique-constraint collision.';

-- Only the security definer RPCs need this, and they run as the owner, so no
-- client role has any reason to be able to farm codes from it.
revoke execute on function public.generate_entry_code () from public, anon, authenticated;

-- The signup trigger from 20260904000000 fires on every auth.users insert and
-- unconditionally writes a teacher profile. That is correct today because only
-- teachers authenticate, and this schema keeps students out of auth.users
-- entirely -- but the trigger should not be the thing standing between a future
-- experiment and a table full of accidental teachers.
--
-- A missing role is treated as 'teacher' so signups created before this
-- migration, and any client that has not yet been updated, keep working.
create or replace function public.handle_new_teacher ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'role', 'teacher') <> 'teacher' then
    return new;
  end if;

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
