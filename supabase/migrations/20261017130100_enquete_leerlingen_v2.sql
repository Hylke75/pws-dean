-- Nieuwe leerlingenenquête over vakkenkeuze en AI. De vorige versie blijft
-- als gesloten archief bestaan; de korte link /e/leerlingen gaat naar de nieuwe.

do $$
declare
  v_id uuid;
  v_keuze uuid;
  vaardig jsonb := '["Creativiteit", "Kritisch denken", "Samenwerken", "Communiceren", "Programmeren", "Data analyseren", "Werken met AI", "Rekenen/wiskunde", "Probleemoplossend denken", "Leidinggeven"]';
  zeker jsonb := '["Zeker niet", "Waarschijnlijk niet", "Misschien", "Waarschijnlijk wel", "Zeker wel"]';
begin
  -- Oude versie bewaren als gesloten archief, zonder korte link.
  update pws_surveys
  set slug = null, status = 'gesloten', title = 'Oud – ' || title
  where slug = 'leerlingen';

  insert into pws_surveys (title, intro, afsluiting, status, slug)
  values (
    'AI en de toekomst van werk – leerlingen en studenten',
    'Hoi! Ik zit in 6 vwo en onderzoek voor mijn profielwerkstuk hoe leerlingen hun profiel en vakken kiezen, en of die keuze past bij werk waarin AI steeds belangrijker wordt. Ik ben benieuwd wat jij denkt. De enquête is anoniem en duurt ongeveer 5 minuten. Bedankt!',
    'Dank je wel voor het invullen!',
    'open', 'leerlingen'
  ) returning id into v_id;

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
  (v_id, 0, 'Over jou', 'meerkeuze', 'In welk leerjaar zit je?', '["4 vwo", "5 vwo", "6 vwo"]', true, '{}'),
  (v_id, 1, 'Over jou', 'meerkeuze', 'Welk profiel volg je?', '["C&M", "E&M", "N&G", "N&T", "Combinatie"]', true, '{}'),
  (v_id, 2, 'Over jou', 'meerdere', 'Welke keuzevakken heb je gekozen?',
    '["Aardrijkskunde", "Bedrijfseconomie", "Biologie", "Economie", "Filosofie", "Geschiedenis", "Informatica", "Kunst", "Maatschappijwetenschappen", "Natuurkunde", "Scheikunde", "Wiskunde D", "Frans", "Duits", "Spaans", "BSM (lichamelijke opvoeding)", "NLT", "Anders"]', true,
    '{"andersTekst": true}'),
  (v_id, 3, 'Je vakkenkeuze', 'stellingen', 'Hoe belangrijk waren de volgende redenen bij jouw profiel- en vakkeuze?', '[]', true,
    '{"labels": ["Helemaal niet belangrijk", "Niet belangrijk", "Neutraal", "Belangrijk", "Heel belangrijk"],
      "items": ["Interesse", "Cijfers / waar ik goed in ben", "Vervolgopleiding", "Toekomstige baan", "Verwacht salaris", "Advies van ouders", "Advies van school of docenten", "Vrienden"]}'),
  (v_id, 4, 'Je vakkenkeuze', 'schaal', 'Hoeveel heb je bij je vakkenpakket nagedacht over welke vaardigheden later gevraagd worden op de arbeidsmarkt?', '[]', true,
    '{"labels": ["Helemaal niet", "Weinig", "Gemiddeld", "Veel", "Heel veel"]}'),
  (v_id, 5, 'AI en vaardigheden', 'schaal', 'Hoeveel denk je dat AI het beroep dat jij later waarschijnlijk wilt doen zal veranderen?', '[]', true,
    '{"labels": ["Nauwelijks", "Weinig", "Gemiddeld", "Sterk", "Zeer sterk"], "weetNiet": true, "weetNietLabel": "Ik weet nog niet welk beroep ik wil doen"}'),
  (v_id, 6, 'AI en vaardigheden', 'meerdere', 'Welke vaardigheden denk jij dat door AI belangrijker worden op de arbeidsmarkt?', vaardig, true,
    '{"max": 3, "vergelijk": "vaardigheden_belangrijker"}'),
  (v_id, 7, 'AI en vaardigheden', 'meerdere', 'Welke vaardigheden denk jij dat door AI juist minder belangrijk worden?', vaardig, true,
    '{"max": 3, "vergelijk": "vaardigheden_minder"}'),
  (v_id, 8, 'AI en vaardigheden', 'schaal', 'Hoe goed denk je dat jouw huidige vakkenpakket je voorbereidt op werken in een wereld waarin AI veel wordt gebruikt?', '[]', true,
    '{"labels": ["Zeer slecht", "Slecht", "Neutraal", "Goed", "Zeer goed"], "vergelijk": "voorbereiding"}'),
  (v_id, 9, 'Terugblik en toekomst', 'meerkeuze', 'Heb je bij het kiezen van je vakken rekening gehouden met AI?',
    '["Ja, veel", "Een beetje", "Nee", "AI speelde toen nog geen rol voor mij"]', true, '{}');

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
  values (v_id, 10, 'Terugblik en toekomst', 'meerkeuze',
    'Stel dat je vandaag opnieuw je vakkenpakket mocht kiezen en je wist dat AI de arbeidsmarkt sterk gaat veranderen. Zou je dan andere vakken kiezen?',
    zeker, true, '{}')
  returning id into v_keuze;

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
  (v_id, 11, 'Terugblik en toekomst', 'open', 'Welke vakken zou je anders kiezen?', '[]', false,
    jsonb_build_object('maxLengte', 200, 'toonAls', jsonb_build_object('vraag', v_keuze, 'waarden', '["Misschien", "Waarschijnlijk wel", "Zeker wel"]'::jsonb))),
  (v_id, 12, 'Terugblik en toekomst', 'meerdere', 'Welke van deze onderwerpen zou volgens jou meer aandacht moeten krijgen op het vwo?',
    '["AI gebruiken", "Programmeren", "Data-analyse", "Financiële vaardigheden", "Ondernemerschap", "Communicatie", "Kritisch omgaan met informatie", "Psychologie/gedrag", "Anders"]', true,
    '{"max": 3, "andersTekst": true}'),
  (v_id, 13, 'Terugblik en toekomst', 'meerkeuze', 'Stel dat school één nieuw keuzevak ‘AI & digitale vaardigheden’ aanbiedt. Zou je dit kiezen?', zeker, true, '{}'),
  (v_id, 14, 'Terugblik en toekomst', 'open', 'Wat vind jij dat school je nu onvoldoende leert voor je toekomstige studie of werk?', '[]', false,
    '{"maxLengte": 300}');
end $$;
