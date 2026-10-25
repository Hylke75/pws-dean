-- Eenvoudigere planning: alles af op 23 december. Fase 1–6 blijven (met het werk van Dean);
-- fase 7–13 krijgen een nieuwe indeling; de lege fasen 14–23 worden verborgen (niet verwijderd).

alter table public.pws_phases add column if not exists verborgen boolean not null default false;

-- Verborgen fasen (en hun checkpunten) zijn nergens meer zichtbaar.
alter policy pws_phases_all on public.pws_phases using (not verborgen) with check (true);
alter policy pws_toets_criteria_all on public.pws_toets_criteria
  using (exists (select 1 from public.pws_phases p where p.id = phase_id))
  with check (true);

do $$
declare v_14 uuid; f record; v_id uuid; c text; i int;
begin
  -- Alleen uitvoeren zolang de oude indeling met 23 zichtbare fasen er nog staat.
  if not exists (select 1 from public.pws_phases where order_index = 23 and not verborgen) then return; end if;

  select id into v_14 from public.pws_phases where order_index = 14;

  -- Oude checkpunten van fase 7–13 bij de verborgen fase 14 parkeren.
  update public.pws_toets_criteria set phase_id = v_14
  where phase_id in (select id from public.pws_phases where order_index between 7 and 13);

  update public.pws_phases set verborgen = true, start_date = null, deadline = null
  where order_index between 14 and 23;

  update public.pws_phases set deadline = date '2026-11-01' where order_index = 6;

  for f in select * from (values
    (7, 'Resultaten verwerken en analyseren', 'Alle onderzoeksresultaten ordenen en analyseren. Zoeken naar patronen, verschillen en opvallende resultaten en waar nuttig grafieken maken.', '2026-11-02', '2026-11-15', false,
        array['De resultaten zijn geordend in tabellen of categorieën.', 'Patronen, verschillen en opvallende resultaten zijn beschreven.', 'Er zijn passende grafieken gemaakt.']),
    (8, 'Deelvragen, conclusie en discussie', 'Eigen resultaten combineren met het bronnenonderzoek en daarmee de deelvragen beantwoorden. Daarna een onderbouwd antwoord op de hoofdvraag en de discussie: betrouwbaarheid, beperkingen en vervolgonderzoek.', '2026-11-16', '2026-11-29', false,
        array['Elke deelvraag is beantwoord met resultaten en bronnen.', 'De hoofdvraag is beantwoord en de conclusie volgt uit de deelvragen.', 'Betrouwbaarheid, beperkingen en vervolgonderzoek zijn besproken.']),
    (9, 'Complete versie en feedback', 'Alle onderdelen samenvoegen tot één complete versie, die aan de begeleider geven en de feedback verwerken.', '2026-11-30', '2026-12-13', false,
        array['Alle hoofdstukken staan in één complete versie.', 'De begeleider heeft feedback gegeven.', 'De feedback is verwerkt.']),
    (10, 'Afronden', 'Inhoud controleren op samenhang, tekst en bronvermelding afwerken, logboek compleet maken (minimaal 40 uur) en het definitieve bestand maken. Op 23 december is alles af.', '2026-12-14', '2026-12-23', true,
        array['Hoofdvraag, onderzoek, resultaten en conclusie sluiten op elkaar aan.', 'Spelling, bronvermelding (APA), opmaak en bijlagen zijn nagelopen.', 'Het logboek is compleet (minimaal 40 uur).', 'Het definitieve bestand is klaar.']),
    (11, 'PWS inleveren', 'Dit is volgens het tijdpad van school de definitieve inleverdatum.', '2027-02-04', '2027-02-04', true,
        array['Het werkstuk is op tijd ingeleverd.']),
    (12, 'Presentatie voorbereiden', 'Stand/presentatie maken voor de PWS-avond. Wat wilde ik weten? → Hoe heb ik het onderzocht? → Wat heb ik ontdekt? → Wat is mijn conclusie?', '2027-02-05', '2027-02-10', false,
        array['De presentatie beantwoordt de vier vragen.', 'Het verhaal is hardop geoefend.']),
    (13, 'PWS-avond', 'Presentatie van het PWS tijdens de afsluitende avond.', '2027-02-11', '2027-02-11', true,
        array['De presentatie is gegeven.'])
  ) as t(nr, titel, oms, van, tot, mijlpaal, criteria) loop
    update public.pws_phases set title = f.titel, description = f.oms, start_date = f.van::date, deadline = f.tot::date,
           is_milestone = f.mijlpaal, verborgen = false
    where order_index = f.nr returning id into v_id;
    i := 0;
    foreach c in array f.criteria loop
      insert into public.pws_toets_criteria (phase_id, text, order_index) values (v_id, c, i);
      i := i + 1;
    end loop;
  end loop;
end $$;
