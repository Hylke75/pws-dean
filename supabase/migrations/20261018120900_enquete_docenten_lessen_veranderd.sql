-- Docentenenquête: open vraag na 'Hoeveel invloed heeft AI momenteel op de manier waarop u lesgeeft?'.
do $$
declare v_s uuid; v_na int;
begin
  select id into v_s from public.pws_surveys where slug = 'docenten';
  if v_s is null or exists (select 1 from public.pws_survey_questions where survey_id = v_s
                            and text = 'Op welke manier heeft AI het geven van uw lessen veranderd?') then
    return;
  end if;
  select order_index into v_na from public.pws_survey_questions
  where survey_id = v_s and actief and text like 'Hoeveel invloed heeft AI momenteel op de manier waarop u lesgeeft%';
  update public.pws_survey_questions set order_index = order_index + 1
  where survey_id = v_s and order_index > v_na;
  insert into public.pws_survey_questions (survey_id, text, type, options, required, order_index, section, config, actief, versie)
  values (v_s, 'Op welke manier heeft AI het geven van uw lessen veranderd?', 'open', '[]'::jsonb, false, v_na + 1,
          'AI en veranderende vaardigheden',
          '{"maxLengte":500,"toelichting":"Bijvoorbeeld hoe u lessen voorbereidt, welke opdrachten u geeft of hoe u toetst. Eén of twee zinnen is genoeg."}'::jsonb,
          true, 1);
end $$;
