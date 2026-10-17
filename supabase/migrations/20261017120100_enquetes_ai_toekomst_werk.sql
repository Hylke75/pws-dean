-- De drie korte enquêtes 'AI en de toekomst van werk':
-- leerlingen/studenten, docenten en werkenden. Idempotent op slug.

do $$
declare
  v_id uuid;
  v_dep uuid;
  freq jsonb := '["Nooit", "Minder dan maandelijks", "Een paar keer per maand", "Wekelijks", "Dagelijks"]';
  eens jsonb := '["Helemaal oneens", "Oneens", "Neutraal", "Eens", "Helemaal eens"]';
  goed jsonb := '["Heel slecht", "Slecht", "Neutraal", "Goed", "Heel goed"]';
  veel jsonb := '["Helemaal niet", "Weinig", "Gemiddeld", "Veel", "Heel veel"]';
  kort jsonb := '["Weten wat AI is", "Verstandig gebruik", "AI-informatie controleren", "Denkvaardigheden belangrijker", "Lessen aanpassen", "Aansluiting werkgevers"]';
  skills jsonb := '["AI gebruiken", "Digitale vaardigheden", "Programmeren/data analyseren", "Kritisch denken", "Creativiteit", "Problemen oplossen", "Samenwerken/communiceren", "Schrijven", "Rekenen", "Onderzoek doen", "Anders"]';
  vwo_op jsonb := '["Binnen bestaande vakken", "Als apart verplicht vak", "Als keuzevak", "Geen extra aandacht nodig", "Weet ik niet"]';
  uni_richting jsonb := '["Techniek/ICT", "Natuur & gezondheid", "Economie", "Recht", "Maatschappij", "Taal & cultuur", "Anders"]';
begin
  ---------------------------------------------------------------------------
  -- Enquête 1. Leerlingen en studenten
  ---------------------------------------------------------------------------
  if not exists (select 1 from pws_surveys where slug = 'leerlingen') then
    insert into pws_surveys (title, intro, afsluiting, status, slug)
    values (
      'AI en de toekomst van werk – leerlingen en studenten',
      'Hoi! Ik zit in 6 vwo en onderzoek voor mijn profielwerkstuk of school en de universiteit ons goed voorbereiden op werk waarin AI steeds belangrijker wordt. Ik ben benieuwd wat jij denkt. De enquête is anoniem en duurt ongeveer 4 minuten. Bedankt!',
      'Dank je wel voor het invullen!',
      'open', 'leerlingen'
    ) returning id into v_id;

    insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
    values (v_id, 0, 'Over jou', 'meerkeuze', 'Wat doe je nu?',
            '["4 vwo", "5 vwo", "6 vwo", "Bachelor aan de universiteit", "Master aan de universiteit"]', true, '{}')
    returning id into v_dep;

    insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
    (v_id, 1, 'Over jou', 'meerkeuze', 'Welk profiel of welke studierichting heb je?', '[]', true,
      jsonb_build_object('afhankelijkVan', v_dep, 'groepen', jsonb_build_array(
        jsonb_build_object('als', '["4 vwo", "5 vwo", "6 vwo"]'::jsonb, 'opties', '["C&M", "E&M", "N&G", "N&T", "Combinatie"]'::jsonb),
        jsonb_build_object('als', '["Bachelor aan de universiteit", "Master aan de universiteit"]'::jsonb, 'opties', uni_richting)))),
    (v_id, 2, 'Over jou', 'meerkeuze', 'Hoe vaak gebruik je AI, zoals ChatGPT, voor school of studie?', freq, true,
      '{"vergelijk": "ai_frequentie"}'),
    (v_id, 3, 'Over jou', 'meerdere', 'Waarvoor gebruik je AI vooral?',
      '["Uitleg", "Samenvattingen", "Teksten verbeteren", "Ideeën", "Programmeren", "Leren voor toetsen", "Iets anders", "Ik gebruik geen AI"]', true,
      '{"max": 2, "exclusief": ["Ik gebruik geen AI"]}'),
    (v_id, 4, 'Jouw mening', 'stellingen', 'Hoe eens ben je het met deze stellingen?', '[]', true,
      jsonb_build_object('labels', eens, 'weetNiet', true, 'kort', kort, 'vergelijk', 'stellingen', 'items', jsonb_build_array(
        'Ik leer genoeg over wat AI is en hoe het werkt.',
        'Ik leer genoeg over hoe ik AI verstandig mag gebruiken.',
        'Ik leer om te controleren of informatie van AI klopt.',
        'Door AI worden kritisch denken, creativiteit en problemen oplossen belangrijker.',
        'Scholen en universiteiten moeten hun lessen aanpassen aan AI.',
        'Wat ik nu leer, sluit aan op wat werkgevers later belangrijk vinden.'))),
    (v_id, 5, 'Jouw mening', 'schaal', 'Hoe goed bereidt jouw school of studie je voor op werk waarin AI wordt gebruikt?', '[]', true,
      jsonb_build_object('labels', goed, 'weetNiet', true, 'vergelijk', 'voorbereiding')),
    (v_id, 6, 'Jouw mening', 'meerdere', 'Welke vaardigheden worden door AI belangrijker?', skills, true,
      '{"max": 3, "vergelijk": "vaardigheden_belangrijker"}'),
    (v_id, 7, 'Jouw mening', 'meerdere', 'Welke vaardigheden worden door AI minder belangrijk?', skills || '["Geen / weet ik niet"]'::jsonb, true,
      '{"max": 3, "exclusief": ["Geen / weet ik niet"], "vergelijk": "vaardigheden_minder"}'),
    (v_id, 8, 'Toekomst', 'meerkeuze', 'Heb je bij je profiel- of studiekeuze rekening gehouden met AI?',
      '["Ja", "Een beetje", "Nee", "Dat speelde toen nog niet"]', true, '{}'),
    (v_id, 9, 'Toekomst', 'meerkeuze', 'Zou je door AI nu een andere profiel- of studiekeuze maken?',
      '["Zeker niet", "Waarschijnlijk niet", "Misschien", "Waarschijnlijk wel", "Zeker wel"]', true, '{}'),
    (v_id, 10, 'Toekomst', 'meerkeuze', 'Hoe zou AI volgens jou het beste op het vwo aan bod komen?', vwo_op, true,
      '{"vergelijk": "ai_op_vwo"}'),
    (v_id, 11, 'Toekomst', 'open', 'Wat zou school volgens jou als eerste moeten verbeteren om leerlingen voor te bereiden op AI?', '[]', false,
      '{"maxLengte": 300}');
  end if;

  ---------------------------------------------------------------------------
  -- Enquête 2. Docenten
  ---------------------------------------------------------------------------
  if not exists (select 1 from pws_surveys where slug = 'docenten') then
    insert into pws_surveys (title, intro, afsluiting, status, slug)
    values (
      'AI en de toekomst van werk – docenten',
      'Beste docent, ik zit in 6 vwo en onderzoek voor mijn profielwerkstuk hoe goed het onderwijs jongeren voorbereidt op een arbeidsmarkt met AI. Ik hoor graag uw mening. De enquête is anoniem en duurt ongeveer 4 minuten. Alvast bedankt!',
      'Hartelijk dank voor het invullen!',
      'open', 'docenten'
    ) returning id into v_id;

    insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
    values (v_id, 0, 'Over uw werk', 'meerkeuze', 'Waar geeft u les?', '["Bovenbouw vwo", "Universiteit"]', true, '{}')
    returning id into v_dep;

    insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
    (v_id, 1, 'Over uw werk', 'meerkeuze', 'Welk vak of vakgebied geeft u?', '[]', true,
      jsonb_build_object('afhankelijkVan', v_dep, 'groepen', jsonb_build_array(
        jsonb_build_object('als', '["Bovenbouw vwo"]'::jsonb, 'opties', '["Taal", "Wiskunde", "Natuurwetenschappen", "Maatschappij", "Kunst", "ICT", "Anders"]'::jsonb),
        jsonb_build_object('als', '["Universiteit"]'::jsonb, 'opties', uni_richting)))),
    (v_id, 2, 'Over uw werk', 'meerkeuze', 'Hoe vaak gebruikt u AI voor uw werk?', freq, true,
      '{"vergelijk": "ai_frequentie"}'),
    (v_id, 3, 'AI in het onderwijs', 'meerdere', 'Wat doet uw school of universiteit met AI?',
      '["Duidelijke regels", "Aandacht in bestaande vakken", "Apart vak of module", "Docententraining", "Nog weinig", "Weet ik niet"]', true,
      '{"exclusief": ["Weet ik niet"]}'),
    (v_id, 4, 'AI in het onderwijs', 'meerkeuze', 'Is uw onderwijs door AI veranderd?',
      '["Niet", "Een beetje", "Veel", "Weet ik niet"]', true, '{}'),
    (v_id, 5, 'AI in het onderwijs', 'meerkeuze', 'Wat is de grootste belemmering om AI in uw lessen te gebruiken?',
      '["Tijd", "Kennis", "Regels & privacy", "Toetsing", "Geld of middelen", "Geen belemmering", "Anders"]', true, '{}'),
    (v_id, 6, 'AI in het onderwijs', 'stellingen', 'Hoe eens bent u het met deze stellingen?', '[]', true,
      jsonb_build_object('labels', eens, 'weetNiet', true, 'kort', kort, 'vergelijk', 'stellingen', 'items', jsonb_build_array(
        'Mijn leerlingen/studenten leren genoeg over wat AI is en hoe het werkt.',
        'Mijn leerlingen/studenten leren hoe ze AI verstandig mogen gebruiken.',
        'Mijn leerlingen/studenten leren controleren of informatie van AI klopt.',
        'Door AI worden kritisch denken, creativiteit en problemen oplossen belangrijker.',
        'Scholen en universiteiten moeten hun lessen aanpassen aan AI.',
        'Wat leerlingen/studenten nu leren, sluit aan op wat werkgevers later belangrijk vinden.'))),
    (v_id, 7, 'AI in het onderwijs', 'schaal', 'Hoe goed bereidt uw vak of opleiding leerlingen/studenten voor op werken met AI?', '[]', true,
      jsonb_build_object('labels', goed, 'weetNiet', true, 'vergelijk', 'voorbereiding')),
    (v_id, 8, 'Vaardigheden en verbeteringen', 'meerdere', 'Welke vaardigheden worden door AI belangrijker?', skills, true,
      '{"max": 3, "vergelijk": "vaardigheden_belangrijker"}'),
    (v_id, 9, 'Vaardigheden en verbeteringen', 'meerdere', 'Welke vaardigheden worden door AI minder belangrijk?', skills || '["Geen / weet ik niet"]'::jsonb, true,
      '{"max": 3, "exclusief": ["Geen / weet ik niet"], "vergelijk": "vaardigheden_minder"}'),
    (v_id, 10, 'Vaardigheden en verbeteringen', 'meerkeuze', 'Hoe zou AI volgens u het beste op het vwo aan bod komen?', vwo_op, true,
      '{"vergelijk": "ai_op_vwo"}'),
    (v_id, 11, 'Vaardigheden en verbeteringen', 'open', 'Wat zou u als eerste veranderen aan het onderwijs vanwege AI?', '[]', false,
      '{"maxLengte": 300}');
  end if;

  ---------------------------------------------------------------------------
  -- Enquête 3. Werkenden
  ---------------------------------------------------------------------------
  if not exists (select 1 from pws_surveys where slug = 'werkenden') then
    insert into pws_surveys (title, intro, afsluiting, status, slug)
    values (
      'AI en de toekomst van werk – werkenden',
      'Hallo! Ik zit in 6 vwo en onderzoek voor mijn profielwerkstuk of jongeren op school genoeg leren voor een arbeidsmarkt waarin AI steeds belangrijker wordt. Ik ben benieuwd naar uw ervaring op het werk. De enquête is anoniem en duurt ongeveer 4 minuten. Bedankt!',
      'Hartelijk dank voor het invullen!',
      'open', 'werkenden'
    ) returning id into v_id;

    insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
    (v_id, 0, 'Over uw werk', 'meerkeuze', 'In welke sector werkt u?',
      '["ICT", "Zakelijke dienstverlening", "Zorg", "Onderwijs", "Overheid", "Media & communicatie", "Techniek", "Handel & horeca", "Anders"]', true, '{}'),
    (v_id, 1, 'Over uw werk', 'meerkeuze', 'Wat is uw hoogst afgeronde opleiding?',
      '["Middelbare school", "Mbo", "Hbo", "Universiteit", "Anders"]', true, '{}'),
    (v_id, 2, 'Over uw werk', 'meerkeuze', 'Hoe vaak gebruikt u AI voor uw werk?', freq, true,
      '{"vergelijk": "ai_frequentie"}'),
    (v_id, 3, 'Over uw werk', 'meerdere', 'Waarvoor gebruikt u AI vooral?',
      '["Teksten", "Informatie zoeken", "Samenvatten", "Data", "Programmeren", "Beelden maken", "Plannen", "Iets anders", "Ik gebruik geen AI"]', true,
      '{"max": 2, "exclusief": ["Ik gebruik geen AI"]}'),
    (v_id, 4, 'AI en banen', 'schaal', 'Hoeveel is uw werk tot nu toe door AI veranderd?', '[]', true,
      jsonb_build_object('labels', veel, 'weetNiet', true)),
    (v_id, 5, 'AI en banen', 'schaal', 'Hoeveel verwacht u dat uw werk de komende vijf jaar verandert door AI?', '[]', true,
      jsonb_build_object('labels', veel, 'weetNiet', true)),
    (v_id, 6, 'AI en banen', 'stellingen', 'Hoe eens bent u het met deze stellingen?', '[]', true,
      jsonb_build_object('labels', eens, 'weetNiet', true, 'kort', kort, 'vergelijk', 'stellingen', 'items', jsonb_build_array(
        'Jongeren leren genoeg over wat AI is en hoe het werkt.',
        'Jongeren leren genoeg over hoe ze AI verstandig mogen gebruiken.',
        'Jongeren leren controleren of informatie van AI klopt.',
        'Door AI worden kritisch denken, creativiteit en problemen oplossen belangrijker.',
        'Scholen en universiteiten moeten hun lessen aanpassen aan AI.',
        'Wat jongeren nu leren, sluit aan op wat werkgevers belangrijk vinden.'))),
    (v_id, 7, 'AI en banen', 'schaal', 'Hoe goed bereidt het huidige onderwijs jongeren volgens u voor op werk met AI?', '[]', true,
      jsonb_build_object('labels', goed, 'weetNiet', true, 'vergelijk', 'voorbereiding')),
    (v_id, 8, 'Vaardigheden en onderwijs', 'meerdere', 'Welke vaardigheden worden door AI belangrijker?', skills, true,
      '{"max": 3, "vergelijk": "vaardigheden_belangrijker"}'),
    (v_id, 9, 'Vaardigheden en onderwijs', 'meerdere', 'Welke vaardigheden worden door AI minder belangrijk?', skills || '["Geen / weet ik niet"]'::jsonb, true,
      '{"max": 3, "exclusief": ["Geen / weet ik niet"], "vergelijk": "vaardigheden_minder"}'),
    (v_id, 10, 'Vaardigheden en onderwijs', 'meerkeuze', 'Hoe zou AI volgens u het beste op het vwo aan bod komen?', vwo_op, true,
      '{"vergelijk": "ai_op_vwo"}'),
    (v_id, 11, 'Vaardigheden en onderwijs', 'open', 'Wat moet school jongeren vooral leren voor werk met AI?', '[]', false,
      '{"maxLengte": 300}');
  end if;
end $$;
