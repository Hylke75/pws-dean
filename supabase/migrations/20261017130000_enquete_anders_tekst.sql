-- "Anders: <eigen tekst>" toestaan bij vragen met andersTekst.

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
      if v_value like 'Anders: %' and coalesce((q.config->>'andersTekst')::boolean, false)
         and v_allowed ? 'Anders' then
        v_value := left(v_value, 210);
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
