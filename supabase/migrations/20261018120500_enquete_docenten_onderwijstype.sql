-- Docentenenquête, vraag 1: antwoord 'Beide' vervalt en 'Voortgezet onderwijs (vwo)' wordt 'Voortgezet onderwijs (vwo / havo)'.
-- De vervolgvraag 'Vanuit welk onderwijstype…' verschijnt daarna alleen nog bij 'Anders'. Antwoordcodes blijven gelijk.
update public.pws_survey_questions q
set options = '["Voortgezet onderwijs (vwo / havo)","Universiteit (wo)","Anders"]'::jsonb,
    config = jsonb_set(q.config, '{codes}', '["vwo","university","other"]'::jsonb)
from public.pws_surveys s
where s.id = q.survey_id and s.slug = 'docenten' and q.actief and q.order_index = 0
  and q.text = 'In welk type onderwijs bent u werkzaam?';

update public.pws_survey_questions q
set config = q.config
  || jsonb_build_object('toonAls', jsonb_build_object('vraag', q.config->'toonAls'->>'vraag', 'waarden', '["other"]'::jsonb))
  || jsonb_build_object('groepen', (select coalesce(jsonb_agg(g), '[]'::jsonb) from jsonb_array_elements(q.config->'groepen') g where not (g->'als' ? 'both')))
from public.pws_surveys s
where s.id = q.survey_id and s.slug = 'docenten' and q.actief
  and q.text like 'Vanuit welk onderwijstype wilt u deze en%'
  and q.config->'toonAls'->'waarden' ? 'both';
