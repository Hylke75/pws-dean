-- Leerlingenenquête: de open vraag 'Welke vakken zou je dan anders kiezen en waarom?' wordt een
-- meerkeuzevraag voor iedereen: 'Als je een vak had kunnen kiezen dat met AI te maken heeft, had je het dan gekozen?'
update public.pws_survey_questions q
set text = 'Als je een vak had kunnen kiezen dat met AI te maken heeft, had je dat dan gekozen?',
    type = 'meerkeuze',
    options = '["Ja","Nee","Weet ik niet"]'::jsonb,
    config = '{"codes":["yes","no","dont_know"],"toelichting":"Bijvoorbeeld een keuzevak waarin je leert hoe AI werkt en hoe je het goed gebruikt."}'::jsonb,
    required = true,
    versie = q.versie + 1
from public.pws_surveys s
where s.id = q.survey_id and s.slug = 'leerlingen' and q.actief
  and q.text = 'Welke vakken zou je dan anders kiezen en waarom?';
