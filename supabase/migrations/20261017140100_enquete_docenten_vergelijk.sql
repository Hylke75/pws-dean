-- Open docentvragen koppelen aan de vergelijkingsonderwerpen, zodat hun
-- antwoorden op de vergelijkingspagina bij de grafieken staan.

do $$
declare v_id uuid;
begin
  select id into v_id from pws_surveys where slug = 'docenten';
  if v_id is null then return; end if;
  update pws_survey_questions q set config = q.config || jsonb_build_object('vergelijk', k.sleutel)
  from (values
    ('Welke invloed heeft AI volgens u momenteel%', 'ai_beroep_verandering'),
    ('Waar ziet u dat vooral aan?%', 'ai_beroep_verandering'),
    ('Welke kennis en vaardigheden%', 'vaardigheden_belangrijker'),
    ('Zijn er onderdelen van universitaire opleidingen%', 'vaardigheden_minder'),
    ('In hoeverre sluiten universitaire opleidingen%', 'voorbereiding'),
    ('Wordt AI alleen behandeld binnen technische opleidingen%', 'keuzevak_ai'),
    ('Als u één grote verandering%', 'vwo_onderwerpen')
  ) as k(patroon, sleutel)
  where q.survey_id = v_id and q.text like k.patroon;
end $$;
