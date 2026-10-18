-- Leerlingenenquête: de vraag over een AI-keuzevak vervalt (uit gebruik, niet verwijderd).
update public.pws_survey_questions q
set actief = false
from public.pws_surveys s
where s.id = q.survey_id and s.slug = 'leerlingen' and q.actief
  and q.text = 'Als je een vak had kunnen kiezen dat met AI te maken heeft, had je dat dan gekozen?';
