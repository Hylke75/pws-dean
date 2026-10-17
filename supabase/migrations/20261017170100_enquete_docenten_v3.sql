-- Docentenenquête: 15 algemene vragen + 3 vragen voor vwo-docenten of 3 voor universitaire docenten.
-- Zelfde enquête-ID. Bestaande vragen worden inactief (niet verwijderd), zodat eerdere antwoorden
-- gekoppeld blijven aan hun oorspronkelijke vraag. Daarna komen de nieuwe vragen erbij.

do $$
declare
  v_d uuid;
  q_type uuid; q_route uuid; q_v3 uuid;
  vwo jsonb; uni jsonb;
  skills_labels jsonb := '["Creativiteit", "Kritisch denken", "Samenwerken", "Communiceren", "Programmeren", "Data analyseren", "Werken met AI", "Rekenen / wiskunde", "Probleemoplossend denken", "Leidinggeven"]';
  skills_codes jsonb := '["creativity", "critical_thinking", "collaboration", "communication", "programming", "data_analysis", "ai_skills", "mathematics", "problem_solving", "leadership"]';
  slecht_goed jsonb := '["Zeer slecht", "Slecht", "Neutraal", "Goed", "Zeer goed"]';
begin
  select id into v_d from pws_surveys where slug = 'docenten';
  if v_d is null then return; end if;
  if exists (select 1 from pws_survey_questions where survey_id = v_d and actief and text = 'In welk type onderwijs bent u werkzaam?') then return; end if;

  update pws_survey_questions set actief = false where survey_id = v_d and actief;

  update pws_surveys set
    afsluiting = 'Hartelijk dank voor uw medewerking!',
    intro = E'Goedendag,\n\nVoor mijn profielwerkstuk in 6 vwo onderzoek ik of het huidige onderwijs voldoende aansluit op een arbeidsmarkt die verandert door de opkomst van AI.\n\nIk onderzoek dit vanuit drie perspectieven: leerlingen, docenten en werknemers. Met deze enquête wil ik inzicht krijgen in hoe docenten de invloed van AI ervaren en of zij vinden dat het onderwijs voldoende meeverandert.\n\nDe enquête is anoniem en duurt ongeveer 5 tot 7 minuten. Er zijn geen goede of foute antwoorden.\n\nAlvast hartelijk dank voor uw medewerking!'
  where id = v_d;

  -- DEEL 1 – Achtergrond
  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
  values (v_d, 0, 'Achtergrond', 'meerkeuze', 'In welk type onderwijs bent u werkzaam?',
    '["Voortgezet onderwijs (vwo)", "Universiteit (wo)", "Beide", "Anders"]', true,
    '{"codes": ["vwo", "university", "both", "other"]}')
  returning id into q_type;

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
  values (v_d, 1, 'Achtergrond', 'meerkeuze', 'Vanuit welk onderwijstype wilt u deze enquête beantwoorden?',
    '["Vwo", "Universiteit", "Geen van beide"]', true,
    jsonb_build_object(
      'codes', '["vwo", "university", "none"]'::jsonb,
      'vervolg', true,
      'toonAls', jsonb_build_object('vraag', q_type, 'waarden', '["both", "other"]'::jsonb),
      'afhankelijkVan', q_type,
      'groepen', jsonb_build_array(
        jsonb_build_object('als', '["both"]'::jsonb, 'opties', '["Vwo", "Universiteit"]'::jsonb),
        jsonb_build_object('als', '["other"]'::jsonb, 'opties', '["Vwo", "Universiteit", "Geen van beide"]'::jsonb))))
  returning id into q_route;

  -- De effectieve route: direct gekozen, of via de vervolgvraag bij 'Beide' of 'Anders'.
  vwo := jsonb_build_array(
    jsonb_build_object('vraag', q_type, 'waarden', '["vwo"]'::jsonb),
    jsonb_build_object('vraag', q_route, 'waarden', '["vwo"]'::jsonb));
  uni := jsonb_build_array(
    jsonb_build_object('vraag', q_type, 'waarden', '["university"]'::jsonb),
    jsonb_build_object('vraag', q_route, 'waarden', '["university"]'::jsonb));

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
  (v_d, 2, 'Achtergrond', 'open', 'Wat is uw functie en welk vak of welke opleiding verzorgt u?', '[]', false,
    '{"maxLengte": 200}'),
  (v_d, 3, 'Achtergrond', 'meerkeuze', 'Hoelang werkt u al in het onderwijs?',
    '["Minder dan 5 jaar", "5–10 jaar", "11–20 jaar", "Meer dan 20 jaar"]', true,
    '{"codes": ["lt5", "5_10", "11_20", "gt20"]}'),

  -- DEEL 2 – AI en veranderende vaardigheden
  (v_d, 4, 'AI en veranderende vaardigheden', 'schaal', 'Hoeveel invloed heeft AI momenteel op de manier waarop u lesgeeft?', '[]', true,
    '{"labels": ["Helemaal geen invloed", "Weinig invloed", "Enige invloed", "Veel invloed", "Zeer veel invloed"],
      "weetNiet": true, "weetNietLabel": "Weet ik niet / niet van toepassing"}'),
  (v_d, 5, 'AI en veranderende vaardigheden', 'schaal',
    'Hoeveel denkt u dat AI de beroepen waarvoor uw leerlingen of studenten worden opgeleid de komende tien jaar zal veranderen?', '[]', true,
    '{"labels": ["Nauwelijks", "Weinig", "Gemiddeld", "Sterk", "Zeer sterk"], "weetNiet": true, "vergelijk": "ai_beroep_verandering"}'),
  (v_d, 6, 'AI en veranderende vaardigheden', 'meerdere', 'Welke vaardigheden worden volgens u door AI belangrijker op de arbeidsmarkt?',
    skills_labels || '["Weet ik niet"]'::jsonb, true,
    jsonb_build_object('codes', skills_codes || '["dont_know"]'::jsonb, 'max', 3,
      'exclusief', '["dont_know"]'::jsonb, 'vergelijk', 'vaardigheden_belangrijker')),
  (v_d, 7, 'AI en veranderende vaardigheden', 'meerdere', 'Welke vaardigheden worden volgens u door AI juist minder belangrijk op de arbeidsmarkt?',
    skills_labels || '["Geen van deze vaardigheden", "Weet ik niet"]'::jsonb, true,
    jsonb_build_object('codes', skills_codes || '["none", "dont_know"]'::jsonb, 'max', 3,
      'exclusief', '["none", "dont_know"]'::jsonb, 'vergelijk', 'vaardigheden_minder')),

  -- DEEL 3 – Aansluiting onderwijs en arbeidsmarkt
  (v_d, 8, 'Aansluiting onderwijs en arbeidsmarkt', 'schaal',
    'Hoe goed bereidt het huidige onderwijs binnen uw school of opleiding leerlingen of studenten volgens u voor op een toekomst waarin AI veel wordt gebruikt?', '[]', true,
    jsonb_build_object('labels', slecht_goed, 'weetNiet', true, 'vergelijk', 'voorbereiding')),
  (v_d, 9, 'Aansluiting onderwijs en arbeidsmarkt', 'meerkeuze',
    'In hoeverre is het onderwijs binnen uw school of opleiding de afgelopen drie jaar aangepast vanwege AI?',
    '["Sterk aangepast", "Enigszins aangepast", "Nauwelijks aangepast", "Helemaal niet aangepast", "Weet ik niet"]', true,
    '{"codes": ["strongly", "somewhat", "hardly", "not_at_all", "dont_know"]}'),
  (v_d, 10, 'Aansluiting onderwijs en arbeidsmarkt', 'meerdere',
    'Welke veranderingen zijn er binnen uw school of opleiding doorgevoerd vanwege AI?',
    '["AI wordt besproken binnen bestaande vakken", "Er zijn aparte lessen of modules over AI", "Leerlingen/studenten mogen AI gebruiken bij opdrachten", "De manier van toetsen is veranderd", "Docenten krijgen scholing over AI", "Er zijn nieuwe vakken of onderdelen toegevoegd", "Er zijn nog geen veranderingen doorgevoerd", "Weet ik niet", "Anders, namelijk..."]', true,
    '{"codes": ["in_existing_subjects", "separate_modules", "ai_allowed_assignments", "assessment_changed", "teacher_training", "new_subjects", "no_changes", "dont_know", "other"],
      "exclusief": ["no_changes", "dont_know"], "andersTekst": true, "andersWaarde": "other"}'),

  -- DEEL 4 – Onderwijs van de toekomst
  (v_d, 11, 'Onderwijs van de toekomst', 'meerdere', 'Welke onderwerpen zouden volgens u meer aandacht moeten krijgen op het vwo?',
    '["AI gebruiken", "Programmeren", "Data-analyse", "Financiële vaardigheden", "Ondernemerschap", "Communicatie", "Kritisch omgaan met informatie", "Psychologie / gedrag", "Anders, namelijk...", "Geen van deze onderwerpen", "Weet ik niet"]', true,
    jsonb_build_object(
      'codes', '["ai_usage", "programming", "data_analysis", "financial_skills", "entrepreneurship", "communication", "information_literacy", "psychology", "other", "none", "dont_know"]'::jsonb,
      'max', 3, 'exclusief', '["none", "dont_know"]'::jsonb, 'andersTekst', true, 'andersWaarde', 'other',
      'vergelijk', 'vwo_onderwerpen',
      'extraToelichting', jsonb_build_object('als', uni,
        'tekst', 'Beantwoord deze vraag vanuit wat aankomende studenten volgens u op het vwo zouden moeten leren.'))),
  (v_d, 12, 'Onderwijs van de toekomst', 'meerkeuze', 'Wat vindt u de beste manier om AI een plek te geven in het onderwijs?',
    '["Als apart verplicht vak", "Als keuzevak", "Verwerkt binnen bestaande vakken", "Een combinatie van een apart vak en bestaande vakken", "AI hoeft geen aparte aandacht te krijgen", "Weet ik niet"]', true,
    '{"codes": ["separate_mandatory", "elective", "integrated", "combination", "no_attention", "dont_know"]}'),
  (v_d, 13, 'Onderwijs van de toekomst', 'meerdere', 'Wat maakt het volgens u moeilijk om onderwijs snel aan te passen aan ontwikkelingen rondom AI?',
    '["Landelijke regelgeving en onderwijsprogramma''s", "Gebrek aan tijd", "Gebrek aan financiële middelen", "Onvoldoende AI-kennis bij docenten", "Gebrek aan geschikt lesmateriaal", "Onduidelijkheid over hoe AI zich ontwikkelt", "Weerstand tegen veranderingen", "Andere prioriteiten binnen de onderwijsinstelling", "Er zijn weinig belemmeringen", "Weet ik niet"]', true,
    '{"codes": ["regulation", "time", "funding", "teacher_knowledge", "materials", "uncertainty", "resistance", "other_priorities", "few_barriers", "dont_know"],
      "max": 3, "exclusief": ["few_barriers", "dont_know"]}'),

  -- DEEL 5 – Open vragen
  (v_d, 14, 'Open vragen', 'open',
    'Als u één verandering zou mogen doorvoeren om leerlingen of studenten beter voor te bereiden op de arbeidsmarkt van de toekomst, welke zou dat zijn?', '[]', false,
    '{"maxLengte": 600}'),
  (v_d, 15, 'Open vragen', 'open', 'Hoe denkt u dat het onderwijs binnen uw vakgebied er over tien jaar uitziet door de invloed van AI?', '[]', false,
    '{"maxLengte": 600}');

  -- Aanvullend voor vwo-docenten
  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
  (v_d, 16, 'Aanvullend: vwo', 'meerkeuze', 'Vindt u dat de huidige vier vwo-profielen nog goed aansluiten bij wat leerlingen later nodig hebben?',
    '["Ja, helemaal", "Ja, grotendeels", "Gedeeltelijk", "Nee, nauwelijks", "Nee, helemaal niet", "Weet ik niet"]', true,
    jsonb_build_object('codes', '["yes_fully", "yes_mostly", "partly", "hardly", "not_at_all", "dont_know"]'::jsonb,
      'toonAls', vwo, 'vergelijk', 'profielen_aansluiting')),
  (v_d, 17, 'Aanvullend: vwo', 'schaal', 'Denkt u dat leerlingen bij hun profiel- en vakkeuze voldoende rekening houden met veranderingen op de arbeidsmarkt?', '[]', true,
    jsonb_build_object('labels', '["Helemaal niet", "In geringe mate", "Enigszins", "In sterke mate", "In zeer sterke mate"]'::jsonb,
      'weetNiet', true, 'toonAls', vwo));

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
  values (v_d, 18, 'Aanvullend: vwo', 'meerkeuze', 'Zou u de huidige profielindeling van het vwo willen veranderen vanwege AI en andere ontwikkelingen op de arbeidsmarkt?',
    '["Ja, ingrijpend", "Ja, enigszins", "Nee, de huidige indeling is goed", "Weet ik niet"]', true,
    jsonb_build_object('codes', '["yes_major", "yes_somewhat", "no_fine", "dont_know"]'::jsonb, 'toonAls', vwo))
  returning id into q_v3;

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
  (v_d, 19, 'Aanvullend: vwo', 'open', 'Welke verandering zou u willen doorvoeren?', '[]', false,
    jsonb_build_object('maxLengte', 500, 'vervolg', true,
      'toonAls', jsonb_build_object('vraag', q_v3, 'waarden', '["yes_major", "yes_somewhat"]'::jsonb))),

  -- Aanvullend voor universitaire docenten
  (v_d, 20, 'Aanvullend: universiteit', 'schaal', 'Hoe goed sluiten universitaire opleidingen binnen uw vakgebied momenteel aan op wat werkgevers van afgestudeerden verwachten?', '[]', true,
    jsonb_build_object('labels', slecht_goed, 'weetNiet', true, 'toonAls', uni)),
  (v_d, 21, 'Aanvullend: universiteit', 'meerkeuze', 'Verwacht u dat universitaire opleidingen de komende tien jaar sterk zullen veranderen door AI?',
    '["Ja, vrijwel alle opleidingen", "Ja, vooral technische opleidingen", "Ja, vooral niet-technische opleidingen", "Alleen bepaalde opleidingen", "Nee, nauwelijks", "Weet ik niet"]', true,
    jsonb_build_object('codes', '["yes_all", "yes_technical", "yes_non_technical", "some", "hardly", "dont_know"]'::jsonb, 'toonAls', uni)),
  (v_d, 22, 'Aanvullend: universiteit', 'open', 'Kunt u een concreet voorbeeld geven van hoe een universitaire opleiding door AI is veranderd, of volgens u zou moeten veranderen?', '[]', false,
    jsonb_build_object('maxLengte', 600, 'toonAls', uni));
end $$;

-- Leerlingen vraag 17 en vwo-docenten V1 dezelfde vergelijkingssleutel geven (alleen metadata, geen inhoud).
update pws_survey_questions q set config = q.config || '{"vergelijk": "profielen_aansluiting"}'
from pws_surveys s
where s.id = q.survey_id and s.slug = 'leerlingen' and q.actief
  and q.text like 'Vind jij dat de huidige vier vwo-profielen%' and not q.config ? 'vergelijk';
