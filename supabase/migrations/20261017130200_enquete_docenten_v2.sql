-- Nieuwe docentenenquête met open vragen voor docenten in het hoger onderwijs.
-- De vorige versie blijft als gesloten archief bestaan; /e/docenten gaat naar de nieuwe.

do $$
declare
  v_id uuid;
  v_markt uuid;
  o jsonb := '{"maxLengte": 1000}';
begin
  -- Oude versie bewaren als gesloten archief, zonder korte link.
  update pws_surveys
  set slug = null, status = 'gesloten', title = 'Oud – ' || title
  where slug = 'docenten';

  insert into pws_surveys (title, intro, afsluiting, status, slug)
  values (
    'AI en de toekomst van werk – docenten',
    'Beste docent, ik zit in 6 vwo en onderzoek voor mijn profielwerkstuk hoe goed het onderwijs jongeren voorbereidt op een arbeidsmarkt met AI. Ik hoor graag uw mening. Alle vragen zijn open; heeft u ergens geen antwoord op, dan kunt u de vraag overslaan. De enquête is anoniem en duurt ongeveer 10 tot 15 minuten. Alvast bedankt!',
    'Hartelijk dank voor het invullen!',
    'open', 'docenten'
  ) returning id into v_id;

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
  (v_id, 0, 'Over u', 'open', 'Wat is uw functie en binnen welke opleiding of faculteit bent u werkzaam?', '[]', false, '{"maxLengte": 300}'),
  (v_id, 1, 'AI en de arbeidsmarkt', 'open', 'Welke invloed heeft AI volgens u momenteel op uw vakgebied?', '[]', false, o);

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config)
  values (v_id, 2, 'AI en de arbeidsmarkt', 'meerkeuze', 'Merkt u dat de arbeidsmarkt voor afgestudeerden binnen uw vakgebied verandert door AI?',
    '["Ja", "Een beetje", "Nee", "Weet ik niet"]', false, '{}')
  returning id into v_markt;

  insert into pws_survey_questions (survey_id, order_index, section, type, text, options, required, config) values
  (v_id, 3, 'AI en de arbeidsmarkt', 'open', 'Waar ziet u dat vooral aan?', '[]', false,
    jsonb_build_object('maxLengte', 1000, 'toonAls', jsonb_build_object('vraag', v_markt, 'waarden', '["Ja", "Een beetje"]'::jsonb))),
  (v_id, 4, 'AI en de arbeidsmarkt', 'open', 'Welke kennis en vaardigheden (die wellicht voorheen niet belangrijk waren) hebben afgestudeerden volgens u in de toekomst nodig om succesvol te zijn op de arbeidsmarkt?', '[]', false, o),
  (v_id, 5, 'AI en de arbeidsmarkt', 'open', 'Zijn die vaardigheden anders dan vijf of tien jaar geleden? Zo ja, wat is er veranderd?', '[]', false, o),
  (v_id, 6, 'AI in de opleiding', 'open', 'In hoeverre is uw opleiding de afgelopen jaren aangepast vanwege ontwikkelingen rondom AI?', '[]', false, o),
  (v_id, 7, 'AI in de opleiding', 'open', 'Zijn er nieuwe vakken, modules of onderdelen op de universiteit bijgekomen die specifiek aandacht besteden aan AI?', '[]', false, o),
  (v_id, 8, 'AI in de opleiding', 'open', 'Wordt AI alleen behandeld binnen technische opleidingen, of vindt u dat studenten binnen vrijwel alle studies ermee moeten leren werken?', '[]', false, o),
  (v_id, 9, 'AI in de opleiding', 'open', 'Zijn er onderdelen van universitaire opleidingen die volgens u minder relevant worden doordat AI bepaalde taken kan overnemen?', '[]', false, o),
  (v_id, 10, 'AI in de opleiding', 'open', 'In hoeverre sluiten universitaire opleidingen volgens u momenteel aan op wat werkgevers van toekomstige afgestudeerden verwachten?', '[]', false, o),
  (v_id, 11, 'Opleidingen aanpassen', 'open', 'Hoe ziet het eruit als een universiteit een opleiding wil aanpassen omdat de universiteit ziet dat de arbeidsmarkt verandert?', '[]', false, o),
  (v_id, 12, 'Opleidingen aanpassen', 'open', 'Welke factoren maken het moeilijk om opleidingen snel aan te passen? Bijvoorbeeld regelgeving, examenprogramma''s, personeel of academische tradities.', '[]', false, o),
  (v_id, 13, 'Opleidingen aanpassen', 'open', 'Verwacht u dat er de komende jaren nieuwe universitaire opleidingen ontstaan als gevolg van AI? Zo ja, wat voor soort opleidingen?', '[]', false, o),
  (v_id, 14, 'Opleidingen aanpassen', 'open', 'Verwacht u ook dat bestaande opleidingen sterk veranderen of misschien zelfs verdwijnen?', '[]', false, o),
  (v_id, 15, 'De toekomst', 'open', 'Welke rol moet een universiteit volgens u spelen: studenten voorbereiden op concrete beroepen, of vooral academische kennis en denkvaardigheden ontwikkelen?', '[]', false, o),
  (v_id, 16, 'De toekomst', 'open', 'Als u één grote verandering in het universitaire onderwijs zou mogen doorvoeren vanwege AI, welke zou dat dan zijn?', '[]', false, o),
  (v_id, 17, 'De toekomst', 'open', 'Hoe denkt u dat universitair onderwijs er over tien jaar uitziet als AI zich in het huidige tempo blijft ontwikkelen?', '[]', false, o),
  (v_id, 18, 'De toekomst', 'open', 'Is er nog iets wat volgens u belangrijk is voor mijn onderzoek dat we nog niet hebben besproken?', '[]', false, o);
end $$;
