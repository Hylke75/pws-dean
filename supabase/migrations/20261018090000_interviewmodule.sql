-- Interviewmodule: digitale interviews met deskundigen via een persoonlijke link.
--
-- Beveiliging
-- * Alle tabellen hebben RLS. Alleen beheerders (pws_iv_beheerders) mogen lezen en schrijven.
-- * Respondenten lezen nooit rechtstreeks uit tabellen: alles gaat via security-definer-functies
--   die een token controleren. Van het token wordt alleen een SHA-256-hash bewaard.
-- * Elke uitnodiging bewaart een vaste kopie (snapshot) van de vragen; latere wijzigingen in de
--   vragensets veranderen bestaande interviews dus niet.

-- ---------------------------------------------------------------------------
-- Beheerders
-- ---------------------------------------------------------------------------
create table if not exists public.pws_iv_beheerders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  actief boolean not null default true,
  toegevoegd_op timestamptz not null default now()
);

-- Alle huidige accounts van de PWS-tracker worden beheerder.
insert into public.pws_iv_beheerders (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.pws_iv_mag_beheren()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.pws_iv_beheerders where user_id = auth.uid() and actief);
$$;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table if not exists public.pws_iv_themas (
  key text primary key,
  naam text not null,
  beschrijving text,
  order_index integer not null default 0
);

create table if not exists public.pws_iv_vragen (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  algemeen boolean not null default false,
  tekst text not null,
  tekst_je text,
  toelichting text,
  toelichting_je text,
  vraagtype text not null default 'open' check (vraagtype in ('open')),
  themas text[] not null default '{}',
  actief boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pws_iv_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  naam text not null,
  beschrijving text,
  aanspreekvorm text not null default 'u' check (aanspreekvorm in ('u', 'je')),
  intro text,
  status text not null default 'concept' check (status in ('concept', 'gepubliceerd')),
  order_index integer not null default 0,
  gearchiveerd boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pws_iv_set (
  type_id uuid not null references public.pws_iv_types(id) on delete cascade,
  vraag_id uuid not null references public.pws_iv_vragen(id) on delete cascade,
  order_index integer not null default 0,
  verplicht boolean not null default false,
  primary key (type_id, vraag_id)
);

create table if not exists public.pws_iv_uitnodigingen (
  id uuid primary key default gen_random_uuid(),
  type_id uuid references public.pws_iv_types(id) on delete set null,
  type_naam text not null,
  naam text not null check (length(naam) between 1 and 200),
  email text check (email is null or length(email) <= 320),
  functie text check (functie is null or length(functie) <= 200),
  organisatie text check (organisatie is null or length(organisatie) <= 200),
  boodschap text check (boodschap is null or length(boodschap) <= 2000),
  aanspreekvorm text not null default 'u' check (aanspreekvorm in ('u', 'je')),
  intro text,
  vragen jsonb not null default '[]'::jsonb,
  token_hash bytea unique,
  status text not null default 'concept' check (status in ('concept', 'uitgenodigd', 'gestart', 'afgerond', 'gesloten')),
  gearchiveerd boolean not null default false,
  toestemming jsonb,
  uitgenodigd_op timestamptz,
  laatste_activiteit timestamptz,
  afgerond_op timestamptz,
  bewaren_tot date,
  opslaan_teller integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists pws_iv_uitnodigingen_status_idx on public.pws_iv_uitnodigingen (status);

create table if not exists public.pws_iv_antwoorden (
  uitnodiging_id uuid not null references public.pws_iv_uitnodigingen(id) on delete cascade,
  vraag_key text not null,
  antwoord text not null default '',
  bijgewerkt_op timestamptz not null default now(),
  primary key (uitnodiging_id, vraag_key)
);

create table if not exists public.pws_iv_instellingen (
  id integer primary key default 1 check (id = 1),
  bewaartermijn_maanden integer not null default 12 check (bewaartermijn_maanden between 1 and 120),
  contact_email text,
  ai_analyse_aan boolean not null default false
);
insert into public.pws_iv_instellingen (id) values (1) on conflict (id) do nothing;

create table if not exists public.pws_iv_analyses (
  id uuid primary key default gen_random_uuid(),
  thema text,
  uitnodiging_ids uuid[] not null default '{}',
  resultaat jsonb not null,
  model text,
  beoordeeld boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: alleen beheerders
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pws_iv_beheerders', 'pws_iv_themas', 'pws_iv_vragen', 'pws_iv_types', 'pws_iv_set',
                           'pws_iv_uitnodigingen', 'pws_iv_antwoorden', 'pws_iv_instellingen', 'pws_iv_analyses'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_beheer') then
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.pws_iv_mag_beheren()) with check (public.pws_iv_mag_beheren())',
        t || '_beheer', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Hulpfuncties
-- ---------------------------------------------------------------------------
create or replace function public.pws_iv_hash(p_token text)
returns bytea
language sql
immutable
set search_path to 'public', 'extensions'
as $$ select extensions.digest(coalesce(p_token, ''), 'sha256') $$;

-- Vaste kopie van de vragen van een interviewtype, in de juiste aanspreekvorm.
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

-- ---------------------------------------------------------------------------
-- Beheerfuncties (alleen ingelogde beheerders)
-- ---------------------------------------------------------------------------
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
    (type_id, type_naam, naam, email, functie, organisatie, boodschap, aanspreekvorm, intro, vragen)
  values
    (v_type.id, v_type.naam, btrim(p_naam), nullif(btrim(p_email), ''), nullif(btrim(p_functie), ''),
     nullif(btrim(p_organisatie), ''), nullif(btrim(p_boodschap), ''), v_type.aanspreekvorm, v_type.intro,
     public.pws_iv_snapshot(v_type.id))
  returning id into v_id;
  return v_id;
end $$;

-- Maakt een nieuwe, onvoorspelbare link. Een eventuele oude link werkt daarna niet meer.
create or replace function public.pws_iv_nieuwe_link(p_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare v_token text;
begin
  if not public.pws_iv_mag_beheren() then raise exception 'geen toegang'; end if;
  v_token := translate(rtrim(encode(extensions.gen_random_bytes(24), 'base64'), '='), '+/', '-_');
  update public.pws_iv_uitnodigingen
  set token_hash = public.pws_iv_hash(v_token),
      status = case when status = 'concept' then 'uitgenodigd' else status end,
      uitgenodigd_op = coalesce(uitgenodigd_op, now())
  where id = p_id;
  if not found then raise exception 'onbekende uitnodiging'; end if;
  return v_token;
end $$;

create or replace function public.pws_iv_link_intrekken(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.pws_iv_mag_beheren() then raise exception 'geen toegang'; end if;
  update public.pws_iv_uitnodigingen set token_hash = null where id = p_id;
end $$;

-- Vragen opnieuw laden uit de huidige vragenset; alleen zolang er nog niets is beantwoord.
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
      intro = t.intro, aanspreekvorm = t.aanspreekvorm, type_naam = t.naam
  from public.pws_iv_types t
  where u.id = p_id and t.id = v.type_id;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Respondentfuncties (via token, ook zonder inloggen)
-- ---------------------------------------------------------------------------
create or replace function public.pws_iv_open(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare v record; v_inst record; v_antw jsonb;
begin
  if p_token is null or length(p_token) < 20 or length(p_token) > 100 then return null; end if;
  select * into v from public.pws_iv_uitnodigingen where token_hash = public.pws_iv_hash(p_token) and not gearchiveerd;
  if not found then return null; end if;
  select * into v_inst from public.pws_iv_instellingen where id = 1;

  if v.status in ('gesloten', 'concept') then
    return jsonb_build_object('status', 'gesloten');
  end if;
  if v.status = 'afgerond' then
    return jsonb_build_object('status', 'afgerond', 'naam', v.naam, 'aanspreekvorm', v.aanspreekvorm);
  end if;

  select coalesce(jsonb_object_agg(vraag_key, antwoord), '{}'::jsonb) into v_antw
  from public.pws_iv_antwoorden where uitnodiging_id = v.id;

  return jsonb_build_object(
    'status', v.status,
    'naam', v.naam, 'functie', v.functie, 'organisatie', v.organisatie,
    'type_naam', v.type_naam, 'aanspreekvorm', v.aanspreekvorm,
    'intro', v.intro, 'boodschap', v.boodschap,
    'vragen', v.vragen, 'antwoorden', v_antw,
    'toestemming', v.toestemming,
    'laatst_opgeslagen', v.laatste_activiteit,
    'contact_email', v_inst.contact_email,
    'ai_aan', v_inst.ai_analyse_aan,
    'bewaartermijn_maanden', v_inst.bewaartermijn_maanden
  );
end $$;

create or replace function public.pws_iv_toestemming(p_token text, p_keuzes jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare v record;
begin
  select * into v from public.pws_iv_uitnodigingen where token_hash = public.pws_iv_hash(p_token) and not gearchiveerd;
  if not found or v.status not in ('uitgenodigd', 'gestart') then return jsonb_build_object('ok', false, 'error', 'gesloten'); end if;
  if coalesce((p_keuzes->>'deelname')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'deelname');
  end if;
  update public.pws_iv_uitnodigingen set
    toestemming = jsonb_build_object(
      'deelname', true,
      'naam_vermelden', coalesce((p_keuzes->>'naam_vermelden')::boolean, false),
      'citeren', coalesce((p_keuzes->>'citeren')::boolean, false),
      'ai', coalesce((p_keuzes->>'ai')::boolean, false),
      'gegeven_op', now()),
    status = 'gestart',
    laatste_activiteit = now()
  where id = v.id;
  return jsonb_build_object('ok', true);
end $$;

-- Tussentijds opslaan. p_antwoorden: {"vraag_key": "tekst", ...}
create or replace function public.pws_iv_opslaan(p_token text, p_antwoorden jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare v record; k text; t text; v_nu timestamptz := now();
begin
  select * into v from public.pws_iv_uitnodigingen where token_hash = public.pws_iv_hash(p_token) and not gearchiveerd;
  if not found then return jsonb_build_object('ok', false, 'error', 'onbekend'); end if;
  if v.status not in ('uitgenodigd', 'gestart') then return jsonb_build_object('ok', false, 'error', 'gesloten'); end if;
  if coalesce((v.toestemming->>'deelname')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'toestemming');
  end if;
  if jsonb_typeof(p_antwoorden) <> 'object' then return jsonb_build_object('ok', false, 'error', 'ongeldig'); end if;
  -- Rem op misbruik: ruim voldoende voor een lang interview met automatisch opslaan.
  if v.opslaan_teller > 20000 then return jsonb_build_object('ok', false, 'error', 'limiet'); end if;

  for k, t in select key, value #>> '{}' from jsonb_each(p_antwoorden) loop
    if not exists (select 1 from jsonb_array_elements(v.vragen) q where q->>'key' = k) then continue; end if;
    insert into public.pws_iv_antwoorden (uitnodiging_id, vraag_key, antwoord, bijgewerkt_op)
    values (v.id, k, left(coalesce(t, ''), 20000), v_nu)
    on conflict (uitnodiging_id, vraag_key)
    do update set antwoord = excluded.antwoord, bijgewerkt_op = excluded.bijgewerkt_op
    where pws_iv_antwoorden.antwoord is distinct from excluded.antwoord;
  end loop;

  update public.pws_iv_uitnodigingen
  set laatste_activiteit = v_nu, status = 'gestart', opslaan_teller = opslaan_teller + 1
  where id = v.id;
  return jsonb_build_object('ok', true, 'opgeslagen_op', v_nu);
end $$;

create or replace function public.pws_iv_afronden(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare v record; v_mist int; v_maanden int;
begin
  select * into v from public.pws_iv_uitnodigingen where token_hash = public.pws_iv_hash(p_token) and not gearchiveerd;
  if not found then return jsonb_build_object('ok', false, 'error', 'onbekend'); end if;
  if v.status not in ('uitgenodigd', 'gestart') then return jsonb_build_object('ok', false, 'error', 'gesloten'); end if;
  if coalesce((v.toestemming->>'deelname')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'toestemming');
  end if;

  select count(*) into v_mist
  from jsonb_array_elements(v.vragen) q
  where coalesce((q->>'verplicht')::boolean, false)
    and not exists (select 1 from public.pws_iv_antwoorden a
                    where a.uitnodiging_id = v.id and a.vraag_key = q->>'key' and btrim(a.antwoord) <> '');
  if v_mist > 0 then return jsonb_build_object('ok', false, 'error', 'verplicht', 'aantal', v_mist); end if;

  select bewaartermijn_maanden into v_maanden from public.pws_iv_instellingen where id = 1;
  update public.pws_iv_uitnodigingen
  set status = 'afgerond', afgerond_op = now(), laatste_activiteit = now(),
      bewaren_tot = (now() + make_interval(months => coalesce(v_maanden, 12)))::date
  where id = v.id;
  return jsonb_build_object('ok', true);
end $$;

-- Verwijdert interviews waarvan de bewaartermijn is verstreken (aangeroepen door de dagelijkse cron).
create or replace function public.pws_iv_opruimen()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare n integer;
begin
  with weg as (
    delete from public.pws_iv_uitnodigingen where bewaren_tot is not null and bewaren_tot < current_date returning 1
  ) select count(*) into n from weg;
  return n;
end $$;

-- Rechten: respondentfuncties voor iedereen, beheerfuncties alleen voor ingelogde gebruikers.
revoke all on function public.pws_iv_open(text) from public;
revoke all on function public.pws_iv_toestemming(text, jsonb) from public;
revoke all on function public.pws_iv_opslaan(text, jsonb) from public;
revoke all on function public.pws_iv_afronden(text) from public;
revoke all on function public.pws_iv_opruimen() from public;
grant execute on function public.pws_iv_open(text) to anon, authenticated;
grant execute on function public.pws_iv_toestemming(text, jsonb) to anon, authenticated;
grant execute on function public.pws_iv_opslaan(text, jsonb) to anon, authenticated;
grant execute on function public.pws_iv_afronden(text) to anon, authenticated;
grant execute on function public.pws_iv_opruimen() to anon, authenticated;

revoke all on function public.pws_iv_snapshot(uuid) from public, anon;
revoke all on function public.pws_iv_nieuwe_uitnodiging(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.pws_iv_nieuwe_link(uuid) from public, anon;
revoke all on function public.pws_iv_link_intrekken(uuid) from public, anon;
revoke all on function public.pws_iv_vragen_vernieuwen(uuid) from public, anon;
grant execute on function public.pws_iv_snapshot(uuid) to authenticated;
grant execute on function public.pws_iv_nieuwe_uitnodiging(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.pws_iv_nieuwe_link(uuid) to authenticated;
grant execute on function public.pws_iv_link_intrekken(uuid) to authenticated;
grant execute on function public.pws_iv_vragen_vernieuwen(uuid) to authenticated;
