-- Enquêtes uitbreiden: korte deellinks, secties, nieuwe vraagtypen
-- (meerdere antwoorden, stellingenblok), validatie bij indienen en
-- een resultaten-RPC die alleen voor ingelogde gebruikers werkt.

alter table public.pws_surveys
  add column if not exists slug text,
  add column if not exists afsluiting text;

alter table public.pws_surveys
  drop constraint if exists pws_surveys_slug_check;
alter table public.pws_surveys
  add constraint pws_surveys_slug_check check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
create unique index if not exists pws_surveys_slug_key on public.pws_surveys (slug);

alter table public.pws_survey_questions
  add column if not exists section text,
  add column if not exists config jsonb not null default '{}'::jsonb;

alter table public.pws_survey_questions
  drop constraint if exists pws_survey_questions_type_check;
alter table public.pws_survey_questions
  add constraint pws_survey_questions_type_check
  check (type = any (array['open', 'meerkeuze', 'meerdere', 'schaal', 'stellingen', 'janee']));

-- Bij een stellingenblok: welke stelling (0-based). Anders null.
alter table public.pws_survey_answers
  add column if not exists item smallint;

create index if not exists pws_survey_answers_response_idx on public.pws_survey_answers (response_id);
create index if not exists pws_survey_responses_survey_idx on public.pws_survey_responses (survey_id);

-- Openbare weergave: op deeltoken óf korte link (slug).
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
  into v_questions from public.pws_survey_questions q where q.survey_id = v_survey.id;
  return jsonb_build_object(
    'title', v_survey.title, 'intro', v_survey.intro,
    'afsluiting', v_survey.afsluiting, 'questions', v_questions
  );
end $$;

-- Indienen met validatie: alleen toegestane waarden, max. aantal keuzes,
-- één antwoord per (vraag, stelling) en een lengtegrens op open antwoorden.
create or replace function public.pws_enquete_indienen(p_token text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_survey_id uuid; v_response_id uuid; a jsonb; q record;
  v_value text; v_item int; v_allowed jsonb; v_count int; v_saved int := 0;
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
      where id = (a->>'question_id')::uuid and survey_id = v_survey_id;
    exception when invalid_text_representation then
      continue;
    end;
    if not found then continue; end if;

    v_value := btrim(coalesce(a->>'value', ''));
    if v_value = '' then continue; end if;
    v_item := null;

    if q.type = 'open' then
      v_value := left(v_value, coalesce((q.config->>'maxLengte')::int, 2000));
    elsif q.type in ('meerkeuze', 'meerdere') then
      v_allowed := q.options || coalesce(
        (select jsonb_agg(o) from jsonb_array_elements(coalesce(q.config->'groepen', '[]'::jsonb)) g,
                                  jsonb_array_elements(g->'opties') o),
        '[]'::jsonb);
      if not v_allowed ? v_value then continue; end if;
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

    if q.type = 'meerdere' and (q.config->>'max') is not null then
      select count(*) into v_count from public.pws_survey_answers
      where response_id = v_response_id and question_id = q.id;
      if v_count >= (q.config->>'max')::int then continue; end if;
    end if;

    insert into public.pws_survey_answers(response_id, question_id, item, value)
    values (v_response_id, q.id, v_item, v_value);
    v_saved := v_saved + 1;
  end loop;

  if v_saved = 0 then
    delete from public.pws_survey_responses where id = v_response_id;
    return jsonb_build_object('ok', false, 'error', 'leeg');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Alle reacties van één enquête, per respondent. Eén jsonb-waarde, zodat
-- de standaard rijlimiet van de API niet in de weg zit.
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
        select jsonb_agg(jsonb_build_object('q', a.question_id, 'i', a.item, 'v', a.value))
        from public.pws_survey_answers a where a.response_id = r.id
      ), '[]'::jsonb)
    ) order by r.created_at)
    from public.pws_survey_responses r
    where r.survey_id = p_survey_id
  ), '[]'::jsonb);
end $$;

revoke all on function public.pws_enquete_resultaten(uuid) from public, anon;
grant execute on function public.pws_enquete_resultaten(uuid) to authenticated;

-- De oude statistiekfunctie lekte resultaten naar niet-ingelogde bezoekers.
create or replace function public.pws_enquete_stats(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_total int; v_counts jsonb; v_open jsonb;
begin
  if auth.uid() is null then return null; end if;
  select count(*) into v_total from public.pws_survey_responses where survey_id = p_survey_id;
  select coalesce(jsonb_agg(jsonb_build_object('question_id', qid, 'value', val, 'n', c)), '[]'::jsonb)
    into v_counts
    from (
      select a.question_id qid, a.value val, count(*) c
      from public.pws_survey_answers a
      join public.pws_survey_responses r on r.id = a.response_id
      where r.survey_id = p_survey_id
      group by a.question_id, a.value
    ) t;
  select coalesce(jsonb_agg(jsonb_build_object('question_id', question_id, 'value', value)), '[]'::jsonb)
    into v_open
    from (
      select a.question_id, a.value
      from public.pws_survey_answers a
      join public.pws_survey_responses r on r.id = a.response_id
      join public.pws_survey_questions q on q.id = a.question_id
      where r.survey_id = p_survey_id and q.type = 'open'
      order by r.created_at
      limit 1000
    ) o;
  return jsonb_build_object('total', v_total, 'counts', v_counts, 'open', v_open);
end $$;

revoke all on function public.pws_enquete_stats(uuid) from public, anon;
grant execute on function public.pws_enquete_stats(uuid) to authenticated;
