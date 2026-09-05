-- Operations that need a server-generated code, an ownership check, or more
-- than one statement under a single transaction.

create function public.create_class (p_name text)
returns public.classes
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  attempt integer;
begin
  if auth.uid () is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.teacher_accounts t where t.id = auth.uid ()) then
    raise exception 'not a teacher' using errcode = '42501';
  end if;

  for attempt in 1 .. 8 loop
    begin
      insert into public.classes (teacher_id, name, class_code)
      values (auth.uid (), btrim(p_name), public.generate_entry_code ())
      returning * into v_class;
      return v_class;
    exception when unique_violation then
      if attempt = 8 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

revoke execute on function public.create_class (text) from public, anon;
grant execute on function public.create_class (text) to authenticated;

create function public.regenerate_class_code (p_class_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  attempt integer;
begin
  if not public.is_class_teacher (p_class_id) then
    raise exception 'not your class' using errcode = '42501';
  end if;

  for attempt in 1 .. 8 loop
    begin
      update public.classes
      set class_code = public.generate_entry_code ()
      where id = p_class_id
      returning class_code into v_code;
      return v_code;
    exception when unique_violation then
      if attempt = 8 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

revoke execute on function public.regenerate_class_code (uuid) from public, anon;
grant execute on function public.regenerate_class_code (uuid) to authenticated;

create function public.create_roster_participant (p_class_id uuid, p_nickname text)
returns public.student_participants
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_participant public.student_participants%rowtype;
  attempt integer;
begin
  if not public.is_class_teacher (p_class_id) then
    raise exception 'not your class' using errcode = '42501';
  end if;

  for attempt in 1 .. 8 loop
    begin
      insert into public.student_participants (class_id, participant_code, nickname)
      values (p_class_id, public.generate_entry_code (), btrim(p_nickname))
      returning * into v_participant;
      return v_participant;
    exception when unique_violation then
      if attempt = 8 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

revoke execute on function public.create_roster_participant (uuid, text) from public, anon;
grant execute on function public.create_roster_participant (uuid, text) to authenticated;

-- The whole student join validation, in one transaction. Returns no rows for
-- every failure mode so the caller cannot accidentally leak which of them
-- happened; the web layer maps "no rows" to one generic message.
--
-- Granted to service_role only. If a browser holding the anon key could call
-- this directly it would mint tickets while bypassing the rate limiter that
-- sits in front of it in the server action.
create function public.join_class (
  p_class_code text,
  p_nickname text default null,
  p_participant_code text default null
)
returns table (
  ticket_id uuid,
  participant_id uuid,
  participant_code text,
  nickname text,
  class_id uuid
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_participant public.student_participants%rowtype;
  v_ticket_id uuid;
  attempt integer;
begin
  select * into v_class
  from public.classes c
  where c.class_code = upper(btrim(p_class_code))
    and c.archived_at is null
    and c.join_open = true;

  if not found then
    return;
  end if;

  -- A participant code, in either mode, means "I already exist here" -- that is
  -- how a student comes back as the same character after their ticket is spent.
  -- Creating a participant is only ever the fallback for a first entry with no
  -- code, and roster classes have no such fallback.
  if coalesce(btrim(p_participant_code), '') <> '' then
    select * into v_participant
    from public.student_participants p
    where p.class_id = v_class.id
      and p.participant_code = upper(btrim(p_participant_code))
      and p.status = 'active';

    if not found then
      return;
    end if;
  else
    if v_class.join_mode = 'roster' then
      return;
    end if;

    if coalesce(btrim(p_nickname), '') = '' then
      return;
    end if;

    for attempt in 1 .. 8 loop
      begin
        insert into public.student_participants (class_id, participant_code, nickname)
        values (v_class.id, public.generate_entry_code (), btrim(p_nickname))
        returning * into v_participant;
        exit;
      exception when unique_violation then
        if attempt = 8 then
          raise;
        end if;
      end;
    end loop;
  end if;

  insert into public.join_tickets (participant_id, class_id, expires_at)
  values (v_participant.id, v_class.id, now() + interval '120 seconds')
  returning id into v_ticket_id;

  return query
    select
      v_ticket_id,
      v_participant.id,
      v_participant.participant_code,
      v_participant.nickname,
      v_class.id;
end;
$$;

-- Revoking from PUBLIC alone is not enough: Supabase's default privileges grant
-- EXECUTE on every new function in this schema to anon and authenticated
-- directly, and a direct grant survives a revoke aimed at PUBLIC. Without the
-- two roles named here, any signed-in teacher could call this and mint a ticket
-- into somebody else's classroom.
revoke execute on function public.join_class (text, text, text)
  from public, anon, authenticated;
grant execute on function public.join_class (text, text, text) to service_role;

-- Consumes a ticket exactly once. The UPDATE is the whole security property:
-- a second attempt matches no row because consumed_at is no longer null.
create function public.consume_join_ticket (p_ticket_id uuid)
returns table (
  participant_id uuid,
  class_id uuid,
  nickname text
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_participant_id uuid;
  v_class_id uuid;
begin
  update public.join_tickets t
  set consumed_at = now()
  where t.id = p_ticket_id
    and t.consumed_at is null
    and t.expires_at > now()
  returning t.participant_id, t.class_id
  into v_participant_id, v_class_id;

  if not found then
    return;
  end if;

  -- Re-check the class between mint and consume: a teacher may have archived it
  -- or closed the door inside the ticket's 120-second window.
  return query
    select p.id, p.class_id, p.nickname
    from public.student_participants p
    join public.classes c on c.id = p.class_id
    where p.id = v_participant_id
      and p.class_id = v_class_id
      and p.status = 'active'
      and c.archived_at is null;
end;
$$;

revoke execute on function public.consume_join_ticket (uuid)
  from public, anon, authenticated;
grant execute on function public.consume_join_ticket (uuid) to service_role;
