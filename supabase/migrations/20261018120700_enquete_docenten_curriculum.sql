-- Docentenenquête: nieuwe vraag na vraag 12 over de aansluiting van het curriculum op de arbeidsmarkt.
do $$
declare v_s uuid;
begin
  select id into v_s from public.pws_surveys where slug = 'docenten';
  if v_s is null or exists (select 1 from public.pws_survey_questions where survey_id = v_s
                            and text = 'Vindt u dat het huidige curriculum nog aansluit op de arbeidsmarkt?') then
    return;
  end if;
  update public.pws_survey_questions set order_index = order_index + 1
  where survey_id = v_s and order_index >= 13;
  insert into public.pws_survey_questions (survey_id, text, type, options, required, order_index, section, config, actief, versie)
  values (v_s, 'Vindt u dat het huidige curriculum nog aansluit op de arbeidsmarkt?', 'meerkeuze',
          '["Ja","Nee","Weet ik niet"]'::jsonb, true, 13, 'Onderwijs van de toekomst',
          '{"codes":["yes","no","dont_know"]}'::jsonb, true, 1);
end $$;
