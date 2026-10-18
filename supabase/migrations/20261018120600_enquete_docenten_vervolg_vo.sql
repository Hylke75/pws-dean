-- Docentenenquête, vraag 1a: optie 'Vwo' heet voortaan 'Voortgezet onderwijs' (code blijft 'vwo').
update public.pws_survey_questions q
set options = (select jsonb_agg(case when o #>> '{}' = 'Vwo' then to_jsonb('Voortgezet onderwijs'::text) else o end order by n)
               from jsonb_array_elements(q.options) with ordinality as x(o, n)),
    config = jsonb_set(q.config, '{groepen}', (
      select coalesce(jsonb_agg(jsonb_set(g, '{opties}', (
               select jsonb_agg(case when o #>> '{}' = 'Vwo' then to_jsonb('Voortgezet onderwijs'::text) else o end order by n)
               from jsonb_array_elements(g->'opties') with ordinality as y(o, n)))), '[]'::jsonb)
      from jsonb_array_elements(q.config->'groepen') g))
from public.pws_surveys s
where s.id = q.survey_id and s.slug = 'docenten' and q.actief
  and q.text like 'Vanuit welk onderwijstype wilt u deze en%'
  and q.options ? 'Vwo';
