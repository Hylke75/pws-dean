-- Leerlingenenquête: nieuwe vraag over de aansluiting tussen school en de arbeidsmarkt (op de plek van de vervallen open vraag).
insert into public.pws_survey_questions (survey_id, text, type, options, required, order_index, section, config, actief, versie)
select s.id,
       'Vind je dat wat je op school leert nog goed aansluit bij wat je in de toekomst waarschijnlijk nodig hebt op de arbeidsmarkt?',
       'meerkeuze', '["Ja","Nee","Weet ik niet"]'::jsonb, true, 15, 'School en de toekomst',
       '{"codes":["yes","no","dont_know"]}'::jsonb, true, 1
from public.pws_surveys s
where s.slug = 'leerlingen'
  and not exists (select 1 from public.pws_survey_questions q where q.survey_id = s.id
                  and q.text like 'Vind je dat wat je op school leert nog goed aansluit%');
