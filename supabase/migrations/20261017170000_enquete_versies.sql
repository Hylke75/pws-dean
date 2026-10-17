-- Vraagversies en actieve/inactieve vragen.
-- * Een vraag die verdwijnt uit de vragenlijst wordt inactief, niet verwijderd: antwoorden blijven gekoppeld.
-- * Bij elke inhoudelijke wijziging van een vraag gaat de oude versie naar pws_survey_question_versions
--   en hoogt het versienummer op. Elk antwoord bewaart de vraagversie waarop het is gegeven.

alter table public.pws_survey_questions
  add column if not exists actief boolean not null default true,
  add column if not exists versie integer not null default 1;

alter table public.pws_survey_answers
  add column if not exists vraag_versie integer;

create table if not exists public.pws_survey_question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.pws_survey_questions(id) on delete cascade,
  versie integer not null,
  text text not null,
  type text not null,
  options jsonb not null,
  config jsonb not null,
  required boolean not null,
  vastgelegd_op timestamptz not null default now(),
  unique (question_id, versie)
);

alter table public.pws_survey_question_versions enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'pws_survey_question_versions') then
    create policy pws_survey_question_versions_all on public.pws_survey_question_versions
      for all to authenticated using (true) with check (true);
  end if;
end $$;

create or replace function public.pws_vraag_versie()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (old.text, old.type, old.options, old.config, old.required)
     is distinct from (new.text, new.type, new.options, new.config, new.required) then
    insert into public.pws_survey_question_versions (question_id, versie, text, type, options, config, required)
    values (old.id, old.versie, old.text, old.type, old.options, old.config, old.required)
    on conflict (question_id, versie) do nothing;
    new.versie := old.versie + 1;
  end if;
  return new;
end $$;

revoke all on function public.pws_vraag_versie() from public, anon, authenticated;

create or replace trigger pws_vraag_versie before update on public.pws_survey_questions
  for each row execute function public.pws_vraag_versie();

-- Openbare weergave: alleen actieve vragen.
create or replace function public.pws_enquete_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_survey record; v_questions jsonb;
begin
  select * into v_survey from public.pws_surveys
  where (share_token = p_token or slug = lower(p_token)) and status = 'open'
  limit 1;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'text', q.text, 'type', q.type, 'options', q.options,
      'required', q.required, 'section', q.section, 'config', q.config
    ) order by q.order_index), '[]'::jsonb)
  into v_questions from public.pws_survey_questions q where q.survey_id = v_survey.id and q.actief;
  return jsonb_build_object(
    'title', v_survey.title, 'intro', v_survey.intro,
    'afsluiting', v_survey.afsluiting, 'questions', v_questions
  );
end $$;

-- Resultaten: ook de vraagversie per antwoord.
create or replace function public.pws_enquete_resultaten(p_survey_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'created_at', r.created_at,
      'answers', coalesce((
        select jsonb_agg(jsonb_build_object('q', a.question_id, 'i', a.item, 'v', a.value, 'ver', a.vraag_versie))
        from public.pws_survey_answers a where a.response_id = r.id
      ), '[]'::jsonb)
    ) order by r.created_at)
    from public.pws_survey_responses r
    where r.survey_id = p_survey_id
  ), '[]'::jsonb);
end $$;

revoke all on function public.pws_enquete_resultaten(uuid) from public, anon;
grant execute on function public.pws_enquete_resultaten(uuid) to authenticated;

-- Indienen: alleen actieve vragen, en de vraagversie bij elk antwoord bewaren.
create or replace function public.pws_enquete_indienen(p_token text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_survey_id uuid; v_response_id uuid; a jsonb; q record;
  v_value text; v_basis text; v_anders text; v_item int; v_allowed jsonb; v_count int; v_saved int := 0;
begin
  select id into v_survey_id from public.pws_surveys
  where (share_token = p_token or slug = lower(p_token)) and status = 'open'
  limit 1;
  if v_survey_id is null then return jsonb_build_object('ok', false, 'error', 'gesloten'); end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) > 300 then
    return jsonb_build_object('ok', false, 'error', 'ongeldig');
  end if;

  insert into public.pws_survey_responses(survey_id) values (v_survey_id) returning id into v_response_id;

  for a in select * from jsonb_array_elements(p_answers) loop
    begin
      select * into q from public.pws_survey_questions
      where id = (a->>'question_id')::uuid and survey_id = v_survey_id and actief;
    exception when invalid_text_representation then
      continue;
    end;
    if not found then continue; end if;

    v_value := btrim(coalesce(a->>'value', ''));
    if v_value = '' then continue; end if;
    v_item := null;
    v_basis := v_value;

    if q.type = 'open' then
      v_value := left(v_value, coalesce((q.config->>'maxLengte')::int, 2000));
    elsif q.type in ('meerkeuze', 'meerdere') then
      v_allowed := coalesce(q.config->'codes', q.options) || coalesce(
        (select jsonb_agg(o) from jsonb_array_elements(coalesce(q.config->'groepen', '[]'::jsonb)) g,
                                  jsonb_array_elements(g->'opties') o),
        '[]'::jsonb);
      v_anders := coalesce(q.config->>'andersWaarde', 'Anders');
      if left(v_value, length(v_anders) + 2) = v_anders || ': '
         and coalesce((q.config->>'andersTekst')::boolean, false) and v_allowed ? v_anders then
        v_value := left(v_value, length(v_anders) + 2 + 200);
        v_basis := v_anders;
      elsif not v_allowed ? v_value then
        continue;
      end if;
    elsif q.type = 'janee' then
      if v_value not in ('Ja', 'Nee') then continue; end if;
    elsif q.type in ('schaal', 'stellingen') then
      if not (v_value in ('1', '2', '3', '4', '5')
              or (v_value = 'weet ik niet' and coalesce((q.config->>'weetNiet')::boolean, false))) then
        continue;
      end if;
      if q.type = 'stellingen' then
        begin
          v_item := (a->>'item')::int;
        exception when others then
          continue;
        end;
        if v_item is null or v_item < 0
           or v_item >= jsonb_array_length(coalesce(q.config->'items', '[]'::jsonb)) then
          continue;
        end if;
      end if;
    end if;

    select count(*) into v_count from public.pws_survey_answers
    where response_id = v_response_id and question_id = q.id
      and item is not distinct from v_item
      and (q.type <> 'meerdere' or value = v_value);
    if v_count > 0 then continue; end if;

    if q.type = 'meerdere' and q.config ? 'exclusief' then
      select count(*) into v_count from public.pws_survey_answers
      where response_id = v_response_id and question_id = q.id
        and (q.config->'exclusief' ? v_basis or q.config->'exclusief' ? value);
      if v_count > 0 then continue; end if;
    end if;

    if q.type = 'meerdere' and (q.config->>'max') is not null then
      select count(*) into v_count from public.pws_survey_answers
      where response_id = v_response_id and question_id = q.id;
      if v_count >= (q.config->>'max')::int then continue; end if;
    end if;

    insert into public.pws_survey_answers(response_id, question_id, item, value, vraag_versie)
    values (v_response_id, q.id, v_item, v_value, q.versie);
    v_saved := v_saved + 1;
  end loop;

  if v_saved = 0 then
    delete from public.pws_survey_responses where id = v_response_id;
    return jsonb_build_object('ok', false, 'error', 'leeg');
  end if;
  return jsonb_build_object('ok', true);
end $$;
