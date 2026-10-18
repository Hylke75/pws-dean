-- Leerlingenenquête, vraag 'Welke keuzevakken heb je gekozen?': NLT, Frans, Duits, Grieks en Latijn toevoegen.
-- Bestaande antwoordcodes blijven gelijk; de nieuwe opties krijgen een eigen code.
update public.pws_survey_questions q
set options = '["Wiskunde A","Wiskunde B","Wiskunde C","Wiskunde D","Natuurkunde","Scheikunde","Biologie","NLT","Economie","Bedrijfseconomie","Geschiedenis","Aardrijkskunde","Informatica","Filosofie","Kunst / muziek / beeldende vorming","Frans","Duits","Grieks","Latijn","Extra vreemde taal","Anders, namelijk..."]'::jsonb,
    config = jsonb_set(q.config, '{codes}', '["wiskunde_a","wiskunde_b","wiskunde_c","wiskunde_d","natuurkunde","scheikunde","biologie","nlt","economie","bedrijfseconomie","geschiedenis","aardrijkskunde","informatica","filosofie","kunst","frans","duits","grieks","latijn","extra_taal","other"]'::jsonb)
from public.pws_surveys s
where s.id = q.survey_id and s.slug = 'leerlingen' and q.actief
  and q.text = 'Welke keuzevakken heb je gekozen?'
  and not (q.config->'codes' ? 'nlt');
