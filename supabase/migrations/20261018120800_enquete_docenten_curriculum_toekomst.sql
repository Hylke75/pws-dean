-- Docentenenquête: vraagtekst aangevuld met 'van de toekomst'.
update public.pws_survey_questions q
set text = 'Vindt u dat het huidige curriculum nog aansluit op de arbeidsmarkt van de toekomst?'
from public.pws_surveys s
where s.id = q.survey_id and s.slug = 'docenten'
  and q.text = 'Vindt u dat het huidige curriculum nog aansluit op de arbeidsmarkt?';
