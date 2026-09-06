-- Phase 7 audit finding: create_roster_participant() (20260905070000) checks
-- is_class_teacher(p_class_id) but never checks the class itself is still
-- active. join_class() already refuses a new participant on an archived
-- class (`c.archived_at is null` in its own lookup); this RPC is the other
-- place a participant row can be created and had no equivalent check.
--
-- Not currently reachable from any real user flow -- no UI calls this RPC
-- yet (join_mode 'roster' has no management screen), so this closes a
-- latent gap rather than fixing a live incident, the same posture as
-- 20260906140000's classes policy fix.
create or replace function public.create_roster_participant (p_class_id uuid, p_nickname text)
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

  if exists (
    select 1 from public.classes c where c.id = p_class_id and c.archived_at is not null
  ) then
    raise exception 'class is archived' using errcode = '42501';
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
