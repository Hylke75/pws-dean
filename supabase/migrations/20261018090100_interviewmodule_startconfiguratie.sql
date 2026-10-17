-- Startconfiguratie interviewmodule: thema's, algemene vragen en zeven interviewtypen.
-- Idempotent op sleutels (key/slug).

insert into public.pws_iv_themas (key, naam, beschrijving, order_index) values
  ('huidig_werk', 'Invloed van AI op het huidige werk', 'Hoe AI nu al het werk verandert.', 1),
  ('banen', 'Verwachte veranderingen in banen', 'Welke banen en beroepen veranderen, verdwijnen of ontstaan.', 2),
  ('kansen_risicos', 'Kansen en risico''s', 'Voordelen, nadelen en wie er risico loopt.', 3),
  ('vaardigheden_onderwijs', 'Vaardigheden en onderwijs', 'Welke vaardigheden belangrijk worden en wat het onderwijs moet doen.', 4),
  ('voorbereiding', 'Voorbereiding op de toekomst', 'Wat jongeren, werkgevers en Nederland nu moeten doen.', 5)
on conflict (key) do nothing;

do $$
declare
  intro_u text := E'Bedankt dat u wilt meewerken aan mijn profielwerkstuk!\n\nIk ben Dean en zit in 6 vwo. Voor mijn profielwerkstuk onderzoek ik welke invloed AI heeft op de arbeidsmarkt en hoe jongeren zich kunnen voorbereiden op de toekomst.\n\nNaast enquêtes interview ik een aantal mensen die vanuit hun werk of studie met dit onderwerp te maken hebben.\n\nIk ben vooral benieuwd naar uw eigen ervaringen, kennis en verwachtingen. Er zijn geen goede of foute antwoorden.\n\nAlvast ontzettend bedankt voor uw tijd en hulp!';
  intro_je text := E'Bedankt dat je wilt meewerken aan mijn profielwerkstuk!\n\nIk ben Dean en zit in 6 vwo. Voor mijn profielwerkstuk onderzoek ik welke invloed AI heeft op de arbeidsmarkt en hoe jongeren zich kunnen voorbereiden op de toekomst.\n\nNaast enquêtes interview ik een aantal mensen die vanuit hun werk of studie met dit onderwerp te maken hebben.\n\nIk ben vooral benieuwd naar jouw eigen ervaringen, kennis en verwachtingen. Er zijn geen goede of foute antwoorden.\n\nAlvast ontzettend bedankt voor je tijd en hulp!';
  r record;
  v_type uuid;
  i int;
  k text;
begin
  -- Algemene vragen (centraal beheerd, hergebruikt in elk type)
  insert into public.pws_iv_vragen (key, algemeen, tekst, tekst_je, themas) values
    ('alg_1', true, 'Welke invloed heeft AI volgens u op de manier waarop mensen nu werken?',
                    'Welke invloed heeft AI volgens jou op de manier waarop mensen nu werken?', '{huidig_werk}'),
    ('alg_2', true, 'Welke veranderingen door AI verwacht u de komende vijf tot tien jaar op de arbeidsmarkt?',
                    'Welke veranderingen door AI verwacht je de komende vijf tot tien jaar op de arbeidsmarkt?', '{banen}'),
    ('alg_3', true, 'Denkt u dat AI uiteindelijk meer banen zal laten verdwijnen of juist nieuwe banen zal creëren? Waarom?',
                    'Denk je dat AI uiteindelijk meer banen zal laten verdwijnen of juist nieuwe banen zal creëren? Waarom?', '{banen,kansen_risicos}'),
    ('alg_4', true, 'Welke vaardigheden worden volgens u belangrijker voor mensen die straks gaan werken?',
                    'Welke vaardigheden worden volgens jou belangrijker voor mensen die straks gaan werken?', '{vaardigheden_onderwijs}'),
    ('alg_5', true, 'Zijn er bepaalde groepen werknemers die volgens u meer risico lopen door AI? Kunt u uitleggen waarom?',
                    'Zijn er bepaalde groepen werknemers die volgens jou meer risico lopen door AI? Kun je uitleggen waarom?', '{kansen_risicos}'),
    ('alg_6', true, 'Wat zou Nederland volgens u nu moeten doen om zich goed voor te bereiden op de veranderingen door AI?',
                    'Wat zou Nederland volgens jou nu moeten doen om zich goed voor te bereiden op de veranderingen door AI?', '{voorbereiding}')
  on conflict (key) do nothing;

  -- Doelgroepspecifieke vragen
  insert into public.pws_iv_vragen (key, tekst, themas) values
    ('ai_1', 'Welke werkzaamheden kunnen AI-systemen op dit moment al zelfstandig uitvoeren en waar hebben ze nog echt mensen voor nodig?', '{huidig_werk}'),
    ('ai_2', 'Welke beroepen verwacht u dat de komende vijf jaar het sterkst veranderen door AI? Waarom juist die?', '{banen}'),
    ('ai_3', 'Denkt u dat AI vooral ondersteunend blijft, of dat AI in de toekomst complete functies kan overnemen?', '{banen}'),
    ('ai_4', 'Wat zijn volgens u de belangrijkste beperkingen van AI waardoor menselijke werknemers nodig blijven?', '{kansen_risicos}'),
    ('ai_5', 'Als u nu 17 of 18 jaar zou zijn en een studie moest kiezen, hoe zou AI uw keuze beïnvloeden?', '{voorbereiding,vaardigheden_onderwijs}'),

    ('hr_1', 'Op welke manieren wordt AI binnen uw organisatie gebruikt en wat merken medewerkers daarvan?', '{huidig_werk}'),
    ('hr_2', 'Heeft AI al invloed gehad op het aantal medewerkers dat nodig is of op de functies waarvoor jullie mensen aannemen?', '{banen}'),
    ('hr_3', 'Wordt kennis van AI steeds belangrijker bij het aannemen van nieuwe medewerkers? Kunt u een voorbeeld geven?', '{vaardigheden_onderwijs}'),
    ('hr_4', 'Hoe helpt uw organisatie medewerkers om met AI te leren werken? En wat gebeurt er met medewerkers die daar moeite mee hebben?', '{voorbereiding,vaardigheden_onderwijs}'),
    ('hr_5', 'Wat verwacht u dat er de komende vijf jaar verandert in de manier waarop organisaties personeel zoeken en aannemen?', '{banen}'),

    ('wo_1', 'Wat weten we op basis van wetenschappelijk onderzoek al over de invloed van AI op werkgelegenheid? En waar is nog veel onzekerheid over?', '{banen}'),
    ('wo_2', 'Sommige onderzoekers verwachten dat AI vooral banen vervangt, terwijl anderen denken dat er nieuwe banen ontstaan. Hoe kijkt u naar die verschillende verwachtingen?', '{banen,kansen_risicos}'),
    ('wo_3', 'Wat kunnen we leren van eerdere technologische veranderingen, zoals de komst van computers en het internet?', '{banen}'),
    ('wo_4', 'Denkt u dat AI de verschillen tussen hoog- en laagopgeleide werknemers groter of juist kleiner maakt? Waarom?', '{kansen_risicos}'),
    ('wo_5', 'Welke recente onderzoeken of cijfers zou u ons aanraden om te gebruiken voor ons profielwerkstuk?', '{}'),

    ('docent_1', 'Hoe merkt u dat leerlingen tegenwoordig AI gebruiken bij hun schoolwerk?', '{huidig_werk}'),
    ('docent_2', 'Welke vaardigheden moeten leerlingen volgens u op school leren om later goed met AI te kunnen werken?', '{vaardigheden_onderwijs}'),
    ('docent_3', 'Vindt u dat het huidige onderwijs voldoende aandacht besteedt aan AI? Wat zou er moeten veranderen?', '{vaardigheden_onderwijs}'),
    ('docent_4', 'Verandert AI volgens u wat leerlingen zelf moeten leren en wat ze met behulp van technologie mogen doen?', '{vaardigheden_onderwijs}'),
    ('docent_5', 'Welk advies zou u geven aan een leerling in 6 vwo die binnenkort een studie moet kiezen en rekening wil houden met de opkomst van AI?', '{voorbereiding}'),

    ('wg_1', 'Voor welke werkzaamheden gebruikt uw bedrijf op dit moment AI?', '{huidig_werk}'),
    ('wg_2', 'Kunt u een voorbeeld geven van een taak die door AI sneller, goedkoper of anders wordt uitgevoerd?', '{huidig_werk}'),
    ('wg_3', 'Heeft de inzet van AI ervoor gezorgd dat u minder mensen nodig heeft, nieuwe functies heeft gecreëerd of bestaande functies heeft aangepast?', '{banen}'),
    ('wg_4', 'Wat zijn voor uw bedrijf de grootste voordelen en nadelen van AI?', '{kansen_risicos}'),
    ('wg_5', 'Wat zou u jongeren aanraden die zich voorbereiden op een carrière in een wereld waarin AI steeds meer taken kan uitvoeren?', '{voorbereiding}'),

    ('wn_1', 'Wat voor werk doet u en hoe wordt AI op dit moment binnen uw werk gebruikt?', '{huidig_werk}'),
    ('wn_2', 'Zijn er taken die u vroeger zelf uitvoerde en die nu gedeeltelijk of volledig door AI worden gedaan?', '{huidig_werk,banen}'),
    ('wn_3', 'Heeft AI uw werk volgens u leuker, makkelijker of juist ingewikkelder gemaakt? Kunt u een voorbeeld geven?', '{huidig_werk}'),
    ('wn_4', 'Maakt u zich weleens zorgen dat AI onderdelen van uw werk of uw functie kan overnemen? Waarom wel of niet?', '{kansen_risicos}'),
    ('wn_5', 'Wat zou uw werkgever kunnen doen om u beter voor te bereiden op veranderingen door AI?', '{voorbereiding}'),

    ('st_1', 'Wat studeer je of welk werk doe je nu, en waarom heb je daarvoor gekozen?', '{}'),
    ('st_2', 'Heeft de ontwikkeling van AI invloed gehad op je studie- of beroepskeuze? Waarom wel of niet?', '{voorbereiding}'),
    ('st_3', 'Welke werkzaamheden binnen jouw toekomstige beroep denk je dat AI kan overnemen?', '{banen}'),
    ('st_4', 'Denk je dat het door AI moeilijker of makkelijker wordt om na je studie een baan te vinden? Waarom?', '{kansen_risicos}'),
    ('st_5', 'Vind je dat je tijdens je opleiding voldoende leert over AI en het gebruik ervan in je toekomstige werk?', '{vaardigheden_onderwijs}')
  on conflict (key) do nothing;

  -- Interviewtypen met hun vragenset: eerst de zes algemene vragen, dan de vijf eigen vragen.
  for r in select * from (values
      ('ai-specialist', 'AI-specialist', 'Deskundige op het gebied van kunstmatige intelligentie.', 'u', 'ai', 1),
      ('hr-manager', 'HR-manager of hoofd HR', 'Verantwoordelijk voor personeel en werving binnen een organisatie.', 'u', 'hr', 2),
      ('hoogleraar', 'Hoogleraar of wetenschappelijk onderzoeker', 'Onderzoeker die AI of de arbeidsmarkt bestudeert.', 'u', 'wo', 3),
      ('docent', 'Docent middelbare school', 'Docent in het voortgezet onderwijs.', 'u', 'docent', 4),
      ('werkgever', 'Werkgever of ondernemer', 'Eigenaar of leidinggevende van een bedrijf.', 'u', 'wg', 5),
      ('werknemer', 'Werknemer', 'Iemand die in loondienst werkt en AI tegenkomt in het werk.', 'u', 'wn', 6),
      ('student', 'Student of starter', 'Student of iemand die net begint op de arbeidsmarkt (je-vorm).', 'je', 'st', 7)
    ) as t(slug, naam, beschrijving, vorm, prefix, nr)
  loop
    insert into public.pws_iv_types (slug, naam, beschrijving, aanspreekvorm, intro, status, order_index)
    values (r.slug, r.naam, r.beschrijving, r.vorm, case when r.vorm = 'je' then intro_je else intro_u end, 'gepubliceerd', r.nr)
    on conflict (slug) do nothing;
    select id into v_type from public.pws_iv_types where slug = r.slug;

    i := 0;
    foreach k in array array['alg_1', 'alg_2', 'alg_3', 'alg_4', 'alg_5', 'alg_6',
                             r.prefix || '_1', r.prefix || '_2', r.prefix || '_3', r.prefix || '_4', r.prefix || '_5'] loop
      insert into public.pws_iv_set (type_id, vraag_id, order_index, verplicht)
      select v_type, v.id, i, false from public.pws_iv_vragen v where v.key = k
      on conflict (type_id, vraag_id) do nothing;
      i := i + 1;
    end loop;
  end loop;
end $$;
