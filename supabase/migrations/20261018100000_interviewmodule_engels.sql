-- Interviewmodule: Engelse versie voor respondenten.
-- Vragen en interviewtypen krijgen een optionele Engelse tekst. De respondent kiest zelf de taal;
-- die keuze wordt bewaard zodat Dean ziet dat een interview in het Engels is ingevuld.

alter table public.pws_iv_vragen add column if not exists tekst_en text;
alter table public.pws_iv_vragen add column if not exists toelichting_en text;
alter table public.pws_iv_types add column if not exists naam_en text;
alter table public.pws_iv_types add column if not exists intro_en text;
alter table public.pws_iv_uitnodigingen add column if not exists type_naam_en text;
alter table public.pws_iv_uitnodigingen add column if not exists intro_en text;
alter table public.pws_iv_uitnodigingen add column if not exists taal text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pws_iv_uitnodigingen_taal_check') then
    alter table public.pws_iv_uitnodigingen add constraint pws_iv_uitnodigingen_taal_check check (taal is null or taal in ('nl', 'en'));
  end if;
end $$;

-- Snapshot met Engelse tekst erbij.
create or replace function public.pws_iv_snapshot(p_type_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'key', v.key,
      'tekst', case when t.aanspreekvorm = 'je' and nullif(v.tekst_je, '') is not null then v.tekst_je else v.tekst end,
      'toelichting', case when t.aanspreekvorm = 'je' and nullif(v.toelichting_je, '') is not null then v.toelichting_je else v.toelichting end,
      'tekst_en', nullif(v.tekst_en, ''),
      'toelichting_en', nullif(v.toelichting_en, ''),
      'verplicht', s.verplicht,
      'vraagtype', v.vraagtype,
      'themas', to_jsonb(v.themas),
      'algemeen', v.algemeen
    ) order by s.order_index), '[]'::jsonb)
  from public.pws_iv_set s
  join public.pws_iv_vragen v on v.id = s.vraag_id
  join public.pws_iv_types t on t.id = s.type_id
  where s.type_id = p_type_id and v.actief;
$$;

create or replace function public.pws_iv_nieuwe_uitnodiging(
  p_type_id uuid, p_naam text, p_email text, p_functie text, p_organisatie text, p_boodschap text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_type record; v_id uuid;
begin
  if not public.pws_iv_mag_beheren() then raise exception 'geen toegang'; end if;
  select * into v_type from public.pws_iv_types where id = p_type_id and not gearchiveerd;
  if not found then raise exception 'onbekend interviewtype'; end if;
  if nullif(btrim(p_naam), '') is null then raise exception 'naam is verplicht'; end if;

  insert into public.pws_iv_uitnodigingen
    (type_id, type_naam, type_naam_en, naam, email, functie, organisatie, boodschap, aanspreekvorm, intro, intro_en, vragen)
  values
    (v_type.id, v_type.naam, nullif(v_type.naam_en, ''), btrim(p_naam), nullif(btrim(p_email), ''), nullif(btrim(p_functie), ''),
     nullif(btrim(p_organisatie), ''), nullif(btrim(p_boodschap), ''), v_type.aanspreekvorm, v_type.intro, nullif(v_type.intro_en, ''),
     public.pws_iv_snapshot(v_type.id))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.pws_iv_vragen_vernieuwen(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare v record;
begin
  if not public.pws_iv_mag_beheren() then raise exception 'geen toegang'; end if;
  select * into v from public.pws_iv_uitnodigingen where id = p_id;
  if not found or v.type_id is null then return false; end if;
  if exists (select 1 from public.pws_iv_antwoorden where uitnodiging_id = p_id and antwoord <> '') then return false; end if;
  update public.pws_iv_uitnodigingen u
  set vragen = public.pws_iv_snapshot(v.type_id),
      intro = t.intro, intro_en = nullif(t.intro_en, ''),
      aanspreekvorm = t.aanspreekvorm, type_naam = t.naam, type_naam_en = nullif(t.naam_en, '')
  from public.pws_iv_types t
  where u.id = p_id and t.id = v.type_id;
  return true;
end $$;

-- Openen via de link. Uitnodigingen van vóór de Engelse versie krijgen de Engelse teksten
-- uit de huidige vragenbank erbij (alleen voor weergave; de Nederlandse snapshot blijft leidend).
create or replace function public.pws_iv_open(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare v record; v_inst record; v_antw jsonb; v_vragen jsonb; v_type record;
begin
  if p_token is null or length(p_token) < 20 or length(p_token) > 100 then return null; end if;
  select * into v from public.pws_iv_uitnodigingen where token_hash = public.pws_iv_hash(p_token) and not gearchiveerd;
  if not found then return null; end if;
  select * into v_inst from public.pws_iv_instellingen where id = 1;

  if v.status in ('gesloten', 'concept') then
    return jsonb_build_object('status', 'gesloten', 'taal', v.taal);
  end if;
  if v.status = 'afgerond' then
    return jsonb_build_object('status', 'afgerond', 'naam', v.naam, 'aanspreekvorm', v.aanspreekvorm, 'taal', v.taal);
  end if;

  select coalesce(jsonb_object_agg(vraag_key, antwoord), '{}'::jsonb) into v_antw
  from public.pws_iv_antwoorden where uitnodiging_id = v.id;

  select coalesce(jsonb_agg(
           case when e.elem ? 'tekst_en' then e.elem
                else e.elem || jsonb_build_object('tekst_en', nullif(q.tekst_en, ''), 'toelichting_en', nullif(q.toelichting_en, ''))
           end order by e.nr), '[]'::jsonb)
  into v_vragen
  from jsonb_array_elements(v.vragen) with ordinality as e(elem, nr)
  left join public.pws_iv_vragen q on q.key = e.elem->>'key';

  select naam_en, intro_en into v_type from public.pws_iv_types where id = v.type_id;

  return jsonb_build_object(
    'status', v.status,
    'naam', v.naam, 'functie', v.functie, 'organisatie', v.organisatie,
    'type_naam', v.type_naam, 'type_naam_en', coalesce(v.type_naam_en, nullif(v_type.naam_en, '')),
    'aanspreekvorm', v.aanspreekvorm,
    'intro', v.intro, 'intro_en', coalesce(v.intro_en, nullif(v_type.intro_en, '')),
    'boodschap', v.boodschap,
    'vragen', v_vragen, 'antwoorden', v_antw,
    'toestemming', v.toestemming,
    'taal', v.taal,
    'laatst_opgeslagen', v.laatste_activiteit,
    'contact_email', v_inst.contact_email,
    'ai_aan', v_inst.ai_analyse_aan,
    'bewaartermijn_maanden', v_inst.bewaartermijn_maanden
  );
end $$;

-- De respondent kiest een taal (alleen zolang het interview open is).
create or replace function public.pws_iv_taal(p_token text, p_taal text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
begin
  if p_taal not in ('nl', 'en') then return false; end if;
  update public.pws_iv_uitnodigingen set taal = p_taal
  where token_hash = public.pws_iv_hash(p_token) and not gearchiveerd and status in ('uitgenodigd', 'gestart');
  return found;
end $$;

revoke all on function public.pws_iv_taal(text, text) from public;
grant execute on function public.pws_iv_taal(text, text) to anon, authenticated;
