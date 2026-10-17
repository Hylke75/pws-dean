-- Nieuwe enquête voor werknemers (vervangt 'werkenden'; die blijft als gesloten archief).
-- Daarnaast krijgen vergelijkbare leerlingenvragen een vergelijkingssleutel.

do $$
declare
  v_id uuid;
  vaardig jsonb := '["Creativiteit", "Kritisch denken", "Samenwerken", "Communiceren", "Programmeren", "Data analyseren", "Werken met AI", "Rekenen/wiskunde", "Probleemoplossend denken", "Leidinggeven"]';
  slecht_goed jsonb := '["Zeer slecht", "Slecht", "Neutraal", "Goed", "Zeer goed"]';
begin
  update pws_surveys
  set slug = null, status = 'gesloten', title = 'Oud – ' || title
  where slug = 'werkenden';

  if exists (select 1 from pws_surveys where slug = 'werknemers') then return; end if;

  insert into pws_surveys (title, intro, afsluiting, status, slug)
  values (
    'AI en de toekomst van werk – werknemers',
    E'Hoi!\n\nVoor mijn profielwerkstuk in 6 vwo onderzoek ik of de vakken en profielen op de middelbare school nog goed aansluiten op de arbeidsmarkt, nu AI steeds meer invloed krijgt op ons werk.\n\nMet deze enquête wil ik onderzoeken wat er volgens mensen die al werken verandert door AI, welke vaardigheden belangrijker worden en of het onderwijs jongeren hier goed op voorbereidt.\n\nDe enquête is anoniem en duurt ongeveer 4 tot 5 minuten. Er zijn geen goede of foute antwoorden. Het gaat om jouw eigen ervaringen en mening.\n\nAlvast bedankt voor het invullen!',
    'Bedankt voor het invullen!',
    'open', 'werknemers'
  ) returning id into v_id;

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
  (v_id, 0, 'Over jouw werk', 'meerkeuze', 'In welke sector werk je?',
    '["Technologie / ICT", "Financiële dienstverlening", "Zorg", "Onderwijs", "Overheid", "Marketing / communicatie / media", "Zakelijke dienstverlening / advies", "Techniek / industrie / bouw", "Handel / retail / horeca", "Anders"]', true,
    '{"andersTekst": true}'),
  (v_id, 1, 'Over jouw werk', 'meerkeuze', 'Wat is je hoogst afgeronde opleiding?',
    '["Vmbo / mavo", "Havo", "Vwo", "Mbo", "Hbo", "Universiteit (wo)", "Anders / zeg ik liever niet"]', true, '{}'),
  (v_id, 2, 'Over jouw werk', 'meerkeuze', 'Hoelang werk je al?',
    '["Minder dan 2 jaar", "2–5 jaar", "6–10 jaar", "11–20 jaar", "Meer dan 20 jaar"]', true, '{}'),
  (v_id, 3, 'De invloed van AI op je werk', 'schaal', 'Hoeveel invloed heeft AI op dit moment op jouw dagelijkse werk?', '[]', true,
    '{"labels": ["Helemaal geen invloed", "Weinig invloed", "Enige invloed", "Veel invloed", "Heel veel invloed"]}'),
  (v_id, 4, 'De invloed van AI op je werk', 'meerkeuze', 'Hoe vaak gebruik je AI tijdens je werk, bijvoorbeeld ChatGPT of andere AI-tools?',
    '["Dagelijks", "Een paar keer per week", "Een paar keer per maand", "Minder dan één keer per maand", "Nooit"]', true, '{}'),
  (v_id, 5, 'De invloed van AI op je werk', 'meerdere', 'Wat is er door AI veranderd in jouw werk?',
    '["Ik kan bepaalde taken sneller uitvoeren", "Sommige taken worden door AI overgenomen", "Ik heb nieuwe vaardigheden moeten leren", "Ik doe andere werkzaamheden dan voorheen", "Mijn werk is ingewikkelder geworden", "Mijn werk is makkelijker geworden", "Er is nog weinig of niets veranderd", "Anders"]', true,
    '{"exclusief": ["Er is nog weinig of niets veranderd"], "andersTekst": true}'),
  (v_id, 6, 'De invloed van AI op je werk', 'schaal', 'Hoeveel denk je dat AI jouw beroep de komende tien jaar zal veranderen?', '[]', true,
    '{"labels": ["Nauwelijks", "Weinig", "Gemiddeld", "Sterk", "Zeer sterk"], "vergelijk": "ai_beroep_verandering"}'),
  (v_id, 7, 'Vaardigheden van de toekomst', 'meerdere', 'Welke vaardigheden denk jij dat door AI belangrijker worden op de arbeidsmarkt?', vaardig, true,
    '{"max": 3, "vergelijk": "vaardigheden_belangrijker"}'),
  (v_id, 8, 'Vaardigheden van de toekomst', 'meerdere', 'Welke vaardigheden denk jij dat door AI juist minder belangrijk worden op de arbeidsmarkt?',
    vaardig || '["Geen van deze vaardigheden"]'::jsonb, true,
    '{"max": 3, "exclusief": ["Geen van deze vaardigheden"], "vergelijk": "vaardigheden_minder"}'),
  (v_id, 9, 'Vaardigheden van de toekomst', 'meerkeuze', 'Zijn de vaardigheden die je nu nodig hebt voor je werk anders dan vijf jaar geleden, onder andere door AI?',
    '["Ja, heel anders", "Ja, een beetje anders", "Nee, nauwelijks", "Nee, helemaal niet", "Weet ik niet / niet van toepassing"]', true, '{}'),
  (v_id, 10, 'Onderwijs en voorbereiding op werk', 'schaal', 'Hoe goed heeft jouw opleiding je voorbereid op de vaardigheden die je nu nodig hebt voor je werk?', '[]', true,
    jsonb_build_object('labels', slecht_goed)),
  (v_id, 11, 'Onderwijs en voorbereiding op werk', 'schaal', 'Hoe goed denk je dat het huidige vwo leerlingen voorbereidt op een arbeidsmarkt waarin AI veel wordt gebruikt?', '[]', true,
    jsonb_build_object('labels', slecht_goed, 'weetNiet', true, 'weetNietLabel', 'Weet ik niet / onvoldoende zicht op', 'vergelijk', 'voorbereiding')),
  (v_id, 12, 'Onderwijs en voorbereiding op werk', 'meerdere', 'Welke onderwerpen zouden volgens jou meer aandacht moeten krijgen op het vwo?',
    '["AI gebruiken", "Programmeren", "Data-analyse", "Financiële vaardigheden", "Ondernemerschap", "Communicatie", "Kritisch omgaan met informatie", "Psychologie/gedrag", "Anders"]', true,
    '{"max": 3, "andersTekst": true, "vergelijk": "vwo_onderwerpen"}'),
  (v_id, 13, 'Onderwijs en voorbereiding op werk', 'meerkeuze', 'Vind je dat scholen een keuzevak ‘AI & digitale vaardigheden’ moeten aanbieden?',
    '["Zeker niet", "Waarschijnlijk niet", "Misschien", "Waarschijnlijk wel", "Zeker wel"]', true,
    '{"vergelijk": "keuzevak_ai"}'),
  (v_id, 14, 'De arbeidsmarkt van de toekomst', 'meerkeuze', 'Denk je dat AI het de komende tien jaar moeilijker of makkelijker maakt voor jongeren om hun eerste baan te vinden?',
    '["Veel moeilijker", "Iets moeilijker", "Maakt weinig verschil", "Iets makkelijker", "Veel makkelijker", "Weet ik niet"]', true, '{}'),
  (v_id, 15, 'De arbeidsmarkt van de toekomst', 'open', 'Wat zouden middelbare scholen volgens jou moeten veranderen om leerlingen beter voor te bereiden op hun toekomstige studie en werk?', '[]', false,
    '{"maxLengte": 500}');

  -- Leerlingenvragen die rechtstreeks vergelijkbaar zijn met de werknemers.
  select id into v_id from pws_surveys where slug = 'leerlingen';
  update pws_survey_questions set config = config || '{"vergelijk": "ai_beroep_verandering"}'
  where survey_id = v_id and text like 'Hoeveel denk je dat AI het beroep%';
  update pws_survey_questions set config = config || '{"vergelijk": "vwo_onderwerpen"}'
  where survey_id = v_id and text like 'Welke van deze onderwerpen%';
  update pws_survey_questions set config = config || '{"vergelijk": "keuzevak_ai"}'
  where survey_id = v_id and text like 'Stel dat school één nieuw keuzevak%';
end $$;
