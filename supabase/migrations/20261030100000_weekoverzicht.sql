-- Wekelijks overzicht voor de leerling (mail + melding in de tool), elke maandag.
-- Net als pws_run_reminders: de cronroute roept dit aan met de anon-sleutel. Per leerling en week
-- maar één keer; daarna geeft de functie niets meer terug. Op andere dagen dan maandag ook niets.
create or replace function public.pws_weekoverzicht()
returns table (email text, full_name text, gegevens jsonb)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_nu timestamptz := now();
  v_vandaag date := (v_nu at time zone 'Europe/Amsterdam')::date;
  v_week text := to_char(v_vandaag, 'IYYY-IW');
  v_gegevens jsonb;
begin
  if extract(isodow from v_vandaag) <> 1 then
    return;
  end if;

  select jsonb_build_object(
    'minuten_totaal', coalesce((select sum(minutes) from pws_logboek), 0),
    'minuten_week', coalesce((select sum(minutes) from pws_logboek where log_date > v_vandaag - 7), 0),
    'geschreven', coalesce((select jsonb_agg(section_key) from pws_verslag_secties
                            where section_key not like '\_%' and length(trim(coalesce(notes, ''))) > 0), '[]'::jsonb),
    'deelvragen', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'text', text, 'order_index', order_index) order by order_index)
                            from pws_subquestions), '[]'::jsonb),
    'volgende_deadline', (select jsonb_build_object('titel', title, 'deadline', deadline) from pws_phases
                          where not verborgen and status <> 'klaar' and deadline >= v_vandaag
                          order by deadline limit 1),
    'einddatum', (select deadline from pws_phases where order_index = 10 and not verborgen),
    'interviews_open', (select count(*) from pws_iv_uitnodigingen where not gearchiveerd and status in ('uitgenodigd', 'gestart')),
    'interviews_afgerond', (select count(*) from pws_iv_uitnodigingen where not gearchiveerd and status = 'afgerond'),
    'enquetes', coalesce((select jsonb_agg(jsonb_build_object(
                    'titel', s.title,
                    'totaal', (select count(*) from pws_survey_responses r where r.survey_id = s.id),
                    'week', (select count(*) from pws_survey_responses r where r.survey_id = s.id and r.created_at > v_nu - interval '7 days'))
                    order by s.created_at)
                  from pws_surveys s
                  where not s.verborgen and s.title not ilike 'oud%' and s.title not ilike '%data 2%'), '[]'::jsonb)
  ) into v_gegevens;

  return query
  with leerlingen as (
    select pr.id, pr.email, pr.full_name from pws_profiles pr
    where pr.role = 'student'
      and not exists (
        select 1 from pws_notifications n
        where n.user_id = pr.id and n.type = 'reminder' and n.link = '/verslag?week=' || v_week
      )
  ), ins as (
    insert into pws_notifications (user_id, type, title, body, link)
    select l.id, 'reminder', 'Je weekoverzicht staat klaar',
           'Logboek: ' || round((v_gegevens->>'minuten_totaal')::numeric / 60, 1) || ' uur. Bekijk wat er deze week openstaat in je verslag.',
           '/verslag?week=' || v_week
    from leerlingen l
    returning user_id
  )
  select l.email, l.full_name, v_gegevens
  from leerlingen l join ins on ins.user_id = l.id;
end $$;

revoke all on function public.pws_weekoverzicht() from public;
grant execute on function public.pws_weekoverzicht() to anon, authenticated;
