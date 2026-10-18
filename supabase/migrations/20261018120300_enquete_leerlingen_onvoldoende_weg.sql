-- Leerlingenenquête: de open vraag over wat school onvoldoende leert vervalt (uit gebruik, niet verwijderd).
update public.pws_survey_questions q
set actief = false
from public.pws_surveys s
where s.id = q.survey_id and s.slug = 'leerlingen' and q.actief
  and q.text = 'Wat vind jij dat school je nu onvoldoende leert voor je toekomstige studie of werk?';
