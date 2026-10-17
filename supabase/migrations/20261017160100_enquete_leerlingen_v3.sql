-- Leerlingenenquête bijwerken naar de definitieve vragenlijst (17 vragen + vervolgvraag bij vraag 2).
-- Niet-destructief: bestaande vragen houden hun ID en worden bijgewerkt, nieuwe vragen worden toegevoegd.
-- Er wordt niets verwijderd; de enquête-ID en bestaande antwoorden blijven intact.

do $$
declare
  v_l uuid;
  q uuid[];
  skills_labels jsonb := '["Creativiteit", "Kritisch denken", "Samenwerken", "Communiceren", "Programmeren", "Data analyseren", "Werken met AI", "Rekenen / wiskunde", "Probleemoplossend denken", "Leidinggeven"]';
  skills_codes jsonb := '["creativity", "critical_thinking", "collaboration", "communication", "programming", "data_analysis", "ai_skills", "mathematics", "problem_solving", "leadership"]';
  profielen jsonb := '["Cultuur & Maatschappij (C&M)", "Economie & Maatschappij (E&M)", "Natuur & Gezondheid (N&G)", "Natuur & Techniek (N&T)"]';
  profiel_codes jsonb := '["cm", "em", "ng", "nt"]';
  zeker jsonb := '["Zeker niet", "Waarschijnlijk niet", "Misschien", "Waarschijnlijk wel", "Zeker wel"]';
begin
  select id into v_l from pws_surveys where slug = 'leerlingen';
  if v_l is null then return; end if;
  -- Al bijgewerkt? Dan niets doen.
  if exists (select 1 from pws_survey_questions where survey_id = v_l and text = 'Welke profielen combineer je?') then return; end if;

  -- De vijftien bestaande vragen, in hun huidige volgorde.
  select array_agg(id order by order_index) into q from pws_survey_questions where survey_id = v_l;
  if array_length(q, 1) <> 15 then
    raise exception 'Onverwachte opbouw van de leerlingenenquête (% vragen); niet automatisch bijwerken.', array_length(q, 1);
  end if;

  update pws_surveys set intro =
    E'Hi! Ik zit in 6 vwo en onderzoek voor mijn profielwerkstuk of de vakken en profielen op school nog goed aansluiten op de arbeidsmarkt, nu AI steeds belangrijker wordt.\n\nIk ben benieuwd hoe jij naar je vakkenpakket en de toekomst kijkt.\n\nDe enquête is anoniem en duurt ongeveer 5 minuten. Er zijn geen goede of foute antwoorden. Alvast bedankt!'
  where id = v_l;

  -- 1. Leerjaar
  update pws_survey_questions set order_index = 0, section = 'Over jou', type = 'meerkeuze',
    text = 'In welk leerjaar zit je?', options = '["4 vwo", "5 vwo", "6 vwo"]', required = true, config = '{}'
  where id = q[1];

  -- 2. Profiel
  update pws_survey_questions set order_index = 1, section = 'Over jou', type = 'meerkeuze',
    text = 'Welk profiel volg je?', options = profielen || '["Combinatie van profielen"]'::jsonb, required = true,
    config = jsonb_build_object('codes', profiel_codes || '["combination"]'::jsonb)
  where id = q[2];

  -- 2a. Vervolgvraag bij een combinatieprofiel
  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
  values (v_l, 2, 'Over jou', 'meerdere', 'Welke profielen combineer je?', profielen, true,
    jsonb_build_object('codes', profiel_codes, 'vervolg', true,
      'toonAls', jsonb_build_object('vraag', q[2], 'waarden', '["combination"]'::jsonb)));

  -- 3. Keuzevakken
  update pws_survey_questions set order_index = 3, section = 'Over jou', type = 'meerdere',
    text = 'Welke keuzevakken heb je gekozen?',
    options = '["Wiskunde A", "Wiskunde B", "Wiskunde C", "Wiskunde D", "Natuurkunde", "Scheikunde", "Biologie", "Economie", "Bedrijfseconomie", "Geschiedenis", "Aardrijkskunde", "Informatica", "Filosofie", "Kunst / muziek / beeldende vorming", "Extra vreemde taal", "Anders, namelijk..."]',
    required = false,
    config = '{"codes": ["wiskunde_a", "wiskunde_b", "wiskunde_c", "wiskunde_d", "natuurkunde", "scheikunde", "biologie", "economie", "bedrijfseconomie", "geschiedenis", "aardrijkskunde", "informatica", "filosofie", "kunst", "extra_taal", "other"],
              "andersTekst": true, "andersWaarde": "other",
              "toelichting": "Selecteer alleen de vakken die je zelf hebt gekozen, naast je verplichte vakken."}'
  where id = q[3];

  -- 4. Redenen voor je profiel- en vakkeuze (matrix)
  update pws_survey_questions set order_index = 4, section = 'Je profiel- en vakkeuze', type = 'stellingen',
    text = 'Hoe belangrijk waren de volgende redenen bij het kiezen van jouw profiel en vakken?', options = '[]', required = true,
    config = '{"labels": ["Helemaal niet belangrijk", "Niet zo belangrijk", "Neutraal", "Belangrijk", "Heel belangrijk"],
               "items": ["Ik vind de vakken interessant.", "Ik ben goed in deze vakken.", "Ik heb ze nodig voor mijn vervolgopleiding.",
                         "Ik denk dat ze belangrijk zijn voor mijn toekomstige baan.", "Ik verwacht er later meer mee te verdienen.",
                         "Mijn ouders adviseerden deze keuze.", "Mijn docenten of decaan adviseerden deze keuze.", "Mijn vrienden kozen deze vakken."],
               "kort": ["Interesse", "Goed in de vakken", "Vervolgopleiding", "Toekomstige baan", "Verdienen", "Advies ouders", "Advies docent/decaan", "Vrienden"]}'
  where id = q[4];

  -- 5. Arbeidsmarkt
  update pws_survey_questions set order_index = 5, section = 'Je profiel- en vakkeuze', type = 'schaal',
    text = 'Hoeveel heb je bij het kiezen van je vakkenpakket nagedacht over welke vaardigheden later belangrijk zijn op de arbeidsmarkt?',
    options = '[]', required = true, config = '{"labels": ["Helemaal niet", "Weinig", "Gemiddeld", "Veel", "Heel veel"]}'
  where id = q[5];

  -- 6. Invloed van AI ('weet ik niet' wordt als aparte, niet-numerieke waarde opgeslagen)
  update pws_survey_questions set order_index = 6, section = 'AI en vaardigheden', type = 'schaal',
    text = 'Hoeveel denk je dat AI het beroep dat jij later wilt doen zal veranderen?', options = '[]', required = true,
    config = '{"labels": ["Nauwelijks", "Weinig", "Gemiddeld", "Sterk", "Zeer sterk"], "weetNiet": true,
               "weetNietLabel": "Ik weet nog niet welk beroep ik wil doen", "vergelijk": "ai_beroep_verandering"}'
  where id = q[6];

  -- 7. Belangrijkere vaardigheden
  update pws_survey_questions set order_index = 7, section = 'AI en vaardigheden', type = 'meerdere',
    text = 'Welke vaardigheden denk jij dat door AI belangrijker worden op de arbeidsmarkt?',
    options = skills_labels || '["Weet ik niet"]'::jsonb, required = true,
    config = jsonb_build_object('codes', skills_codes || '["dont_know"]'::jsonb, 'max', 3,
      'exclusief', '["dont_know"]'::jsonb, 'vergelijk', 'vaardigheden_belangrijker')
  where id = q[7];

  -- 8. Minder belangrijke vaardigheden
  update pws_survey_questions set order_index = 8, section = 'AI en vaardigheden', type = 'meerdere',
    text = 'Welke vaardigheden denk jij dat door AI juist minder belangrijk worden op de arbeidsmarkt?',
    options = skills_labels || '["Geen van deze vaardigheden", "Weet ik niet"]'::jsonb, required = true,
    config = jsonb_build_object('codes', skills_codes || '["none", "dont_know"]'::jsonb, 'max', 3,
      'exclusief', '["none", "dont_know"]'::jsonb, 'vergelijk', 'vaardigheden_minder')
  where id = q[8];

  -- 9. Voorbereiding op de toekomst
  update pws_survey_questions set order_index = 9, section = 'AI en vaardigheden', type = 'schaal',
    text = 'Hoe goed denk je dat jouw huidige vakkenpakket je voorbereidt op werken in een wereld waarin AI veel wordt gebruikt?',
    options = '[]', required = true,
    config = '{"labels": ["Zeer slecht", "Slecht", "Neutraal", "Goed", "Zeer goed"], "weetNiet": true, "vergelijk": "voorbereiding"}'
  where id = q[9];

  -- 10. AI bij je vakkeuze
  update pws_survey_questions set order_index = 10, section = 'Terugblik op je keuze', type = 'meerkeuze',
    text = 'Heb je bij het kiezen van je vakken rekening gehouden met AI?',
    options = '["Ja, veel", "Ja, een beetje", "Nee", "AI speelde toen nog geen rol voor mij"]', required = true, config = '{}'
  where id = q[10];

  -- 11. Opnieuw je vakkenpakket kiezen
  update pws_survey_questions set order_index = 11, section = 'Terugblik op je keuze', type = 'meerkeuze',
    text = 'Stel dat je vandaag opnieuw je vakkenpakket mocht kiezen, met wat je nu weet over AI. Zou je dan andere vakken kiezen?',
    options = zeker, required = true, config = '{}'
  where id = q[11];

  -- 12. Andere vakken (alleen bij misschien / waarschijnlijk wel / zeker wel)
  update pws_survey_questions set order_index = 12, section = 'Terugblik op je keuze', type = 'open',
    text = 'Welke vakken zou je dan anders kiezen en waarom?', options = '[]', required = false,
    config = jsonb_build_object('maxLengte', 300,
      'toonAls', jsonb_build_object('vraag', q[11], 'waarden', '["Misschien", "Waarschijnlijk wel", "Zeker wel"]'::jsonb))
  where id = q[12];

  -- 13. Meer aandacht op school
  update pws_survey_questions set order_index = 13, section = 'School en de toekomst', type = 'meerdere',
    text = 'Welke van deze onderwerpen zouden volgens jou meer aandacht moeten krijgen op het vwo?',
    options = '["AI gebruiken", "Programmeren", "Data-analyse", "Financiële vaardigheden", "Ondernemerschap", "Communicatie", "Kritisch omgaan met informatie", "Psychologie / gedrag", "Anders, namelijk...", "Geen van deze onderwerpen", "Weet ik niet"]',
    required = true,
    config = '{"codes": ["ai_usage", "programming", "data_analysis", "financial_skills", "entrepreneurship", "communication", "information_literacy", "psychology", "other", "none", "dont_know"],
               "max": 3, "exclusief": ["none", "dont_know"], "andersTekst": true, "andersWaarde": "other", "vergelijk": "vwo_onderwerpen"}'
  where id = q[13];

  -- 14. Nieuw keuzevak
  update pws_survey_questions set order_index = 14, section = 'School en de toekomst', type = 'meerkeuze',
    text = 'Stel dat jouw school een nieuw keuzevak ‘AI & digitale vaardigheden’ aanbiedt. Zou je dit kiezen?',
    options = zeker, required = true, config = '{"vergelijk": "keuzevak_ai"}'
  where id = q[14];

  -- 15. Wat ontbreekt er?
  update pws_survey_questions set order_index = 15, section = 'School en de toekomst', type = 'open',
    text = 'Wat vind jij dat school je nu onvoldoende leert voor je toekomstige studie of werk?', options = '[]', required = false,
    config = '{"maxLengte": 300}'
  where id = q[15];

  -- 16. Gebruik van AI
  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
  values (v_l, 16, 'School en de toekomst', 'meerkeuze',
    'Hoe vaak gebruik jij AI, bijvoorbeeld ChatGPT, voor schoolwerk of om iets te leren?',
    '["Dagelijks", "Een paar keer per week", "Een paar keer per maand", "Minder dan één keer per maand", "Nooit"]', true,
    '{"codes": ["daily", "weekly", "monthly", "less_than_monthly", "never"], "vergelijk": "ai_frequentie"}');

  -- 17. Huidige schoolprofielen
  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
  values (v_l, 17, 'School en de toekomst', 'meerkeuze',
    'Vind jij dat de huidige vier vwo-profielen (C&M, E&M, N&G en N&T) nog goed passen bij wat leerlingen later nodig hebben?',
    '["Ja, helemaal", "Ja, grotendeels", "Gedeeltelijk", "Nee, nauwelijks", "Nee, helemaal niet", "Weet ik niet"]', true,
    '{"codes": ["yes_fully", "yes_mostly", "partly", "hardly", "not_at_all", "dont_know"]}');
end $$;
