-- Basisschema van de PWS-tracker.
--
-- Het oorspronkelijke basisschema is buiten deze repository aangemaakt en is verloren gegaan.
-- Deze migratie bouwt het opnieuw op uit de code (src/) en uit eerder vastgelegde schemagegevens
-- van de enquêtetabellen. Ze draait vóór alle andere migraties; die bouwen hierop voort
-- (enquête-uitbreidingen, vraagversies, interviewmodule).
--
-- Uitgangspunten
-- * RLS op elke tabel. Ingelogde gebruikers (Dean en zijn ouders/begeleiders, een kleine vertrouwde
--   groep) mogen de trackertabellen lezen en schrijven. Anonieme bezoekers krijgen niets rechtstreeks.
-- * Anonieme toegang tot enquêtes loopt alleen via security-definer-functies met een vaste search_path.
-- * Enquêtereacties en -antwoorden zijn voor ingelogde gebruikers alleen te lezen, nooit te wijzigen
--   of te verwijderen. Een enquête of vraag met reacties kan daarom ook niet worden verwijderd.
-- * Rollen: 'student' (Dean) en 'ouder'/'begeleider' (beoordelaars). De code behandelt iedereen
--   die geen 'student' is als beoordelaar.
-- * Idempotent waar mogelijk: if not exists, create or replace, policies achter een controle.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Hulpfunctie: updated_at bijwerken
-- ---------------------------------------------------------------------------
create or replace function public.pws_touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profielen
-- ---------------------------------------------------------------------------
create table if not exists public.pws_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student' check (role in ('student', 'ouder', 'begeleider')),
  created_at timestamptz not null default now()
);

-- Bij elke nieuwe gebruiker automatisch een profiel (standaard rol: student).
create or replace function public.pws_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.pws_profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'pws_on_auth_user_created' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger pws_on_auth_user_created
      after insert on auth.users
      for each row execute function public.pws_handle_new_user();
  end if;
end $$;

-- Bestaande accounts (als die er al zijn) ook een profiel geven.
insert into public.pws_profiles (id, email)
select u.id, u.email from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Fasen en alles per fase
-- ---------------------------------------------------------------------------
create table if not exists public.pws_phases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date date,
  deadline date,
  order_index integer not null,
  status text not null default 'te_doen' check (status in ('te_doen', 'bezig', 'klaar')),
  is_milestone boolean not null default false,
  notes text,
  veld_data jsonb,
  review_status text not null default 'concept'
    check (review_status in ('concept', 'ingediend', 'goedgekeurd', 'wijzigingen_nodig')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pws_phases_order_index_key unique (order_index)
);

create table if not exists public.pws_toets_criteria (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.pws_phases(id) on delete cascade,
  text text not null,
  order_index integer not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pws_toets_criteria_phase_idx on public.pws_toets_criteria (phase_id, order_index);

create table if not exists public.pws_checklist_items (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.pws_phases(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pws_checklist_items_phase_idx on public.pws_checklist_items (phase_id, order_index);

create table if not exists public.pws_ai_feedback (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.pws_phases(id) on delete cascade,
  verdict text, -- 'klaar' | 'bijna' | 'nog_niet' (komt uit de AI; bewust geen check, zodat opslaan nooit faalt)
  data jsonb,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists pws_ai_feedback_phase_idx on public.pws_ai_feedback (phase_id, created_at desc);

create table if not exists public.pws_reviews (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.pws_phases(id) on delete cascade,
  status text not null check (status in ('goedgekeurd', 'wijzigingen_nodig', 'opmerking')),
  feedback text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists pws_reviews_phase_idx on public.pws_reviews (phase_id, created_at desc);

create table if not exists public.pws_attachments (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid references public.pws_phases(id) on delete cascade,
  kind text not null check (kind in ('link', 'file')),
  label text not null,
  url text,
  storage_path text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint pws_attachments_inhoud_check check (
    (kind = 'link' and url is not null) or (kind = 'file' and storage_path is not null)
  )
);
create index if not exists pws_attachments_phase_idx on public.pws_attachments (phase_id, created_at);

create table if not exists public.pws_deadline_changes (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.pws_phases(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists pws_deadline_changes_phase_idx on public.pws_deadline_changes (phase_id, created_at desc);
create index if not exists pws_deadline_changes_created_idx on public.pws_deadline_changes (created_at desc);

-- ---------------------------------------------------------------------------
-- Logboek, deelvragen, bronnen
-- ---------------------------------------------------------------------------
create table if not exists public.pws_logboek (
  id uuid primary key default gen_random_uuid(),
  log_date date not null default current_date,
  begin_tijd time,
  eind_tijd time,
  activity text not null,
  minutes integer not null check (minutes > 0),
  next_step text,
  phase_id uuid references public.pws_phases(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists pws_logboek_date_idx on public.pws_logboek (log_date desc);

create table if not exists public.pws_subquestions (
  id uuid primary key default gen_random_uuid(),
  text text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pws_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'website'
    check (source_type in ('website', 'boek', 'artikel', 'video', 'interview', 'overig')),
  authors text,
  title text not null,
  year text,
  publisher text,
  url text,
  accessed_on date,
  notes text,
  summary text,
  quotes text,
  reliability jsonb,
  relevance text,
  phase_id uuid references public.pws_phases(id) on delete set null,
  subquestion_id uuid references public.pws_subquestions(id) on delete set null,
  document_path text,
  document_name text,
  created_at timestamptz not null default now()
);
create index if not exists pws_sources_phase_idx on public.pws_sources (phase_id);
create index if not exists pws_sources_subquestion_idx on public.pws_sources (subquestion_id);

-- ---------------------------------------------------------------------------
-- Eigen interviewverslagen (de oude, handmatige interviewlijst)
-- ---------------------------------------------------------------------------
create table if not exists public.pws_interviews (
  id uuid primary key default gen_random_uuid(),
  respondent text,
  rol text,
  datum date,
  phase_id uuid references public.pws_phases(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.pws_interview_items (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.pws_interviews(id) on delete cascade,
  vraag text,
  antwoord text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pws_interview_items_interview_idx on public.pws_interview_items (interview_id, order_index);

-- ---------------------------------------------------------------------------
-- Verslag
-- ---------------------------------------------------------------------------
create table if not exists public.pws_verslag_secties (
  section_key text primary key,
  status text not null default 'te_doen' check (status in ('te_doen', 'bezig', 'klaar')),
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Meldingen
-- ---------------------------------------------------------------------------
create table if not exists public.pws_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.pws_profiles(id) on delete cascade,
  type text not null default 'system' check (type in ('deadline_change', 'reminder', 'system')),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pws_notifications_user_idx on public.pws_notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Enquêtes (kolommen, standaardwaarden en constraints zoals in de oorspronkelijke database;
-- slug, afsluiting, section, config, item, actief, versie, verborgen enz. komen uit latere migraties)
-- ---------------------------------------------------------------------------
create table if not exists public.pws_surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  intro text,
  status text not null default 'concept',
  share_token text not null default encode(extensions.gen_random_bytes(9), 'hex'),
  phase_id uuid,
  created_at timestamptz not null default now(),
  constraint pws_surveys_status_check check (status = any (array['concept', 'open', 'gesloten'])),
  constraint pws_surveys_share_token_key unique (share_token),
  constraint pws_surveys_phase_id_fkey foreign key (phase_id) references public.pws_phases(id) on delete set null
);

create table if not exists public.pws_survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null,
  text text not null,
  type text not null default 'open',
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  order_index integer not null default 0,
  constraint pws_survey_questions_type_check check (type = any (array['open', 'meerkeuze', 'schaal', 'janee'])),
  constraint pws_survey_questions_survey_id_fkey foreign key (survey_id) references public.pws_surveys(id) on delete cascade
);
create index if not exists pws_survey_questions_survey_idx on public.pws_survey_questions (survey_id, order_index);

create table if not exists public.pws_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null,
  created_at timestamptz not null default now(),
  constraint pws_survey_responses_survey_id_fkey foreign key (survey_id) references public.pws_surveys(id) on delete cascade
);

create table if not exists public.pws_survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null,
  question_id uuid not null,
  value text,
  constraint pws_survey_answers_response_id_fkey foreign key (response_id) references public.pws_survey_responses(id) on delete cascade,
  constraint pws_survey_answers_question_id_fkey foreign key (question_id) references public.pws_survey_questions(id) on delete cascade
);
create index if not exists pws_survey_answers_question_idx on public.pws_survey_answers (question_id);

-- ---------------------------------------------------------------------------
-- updated_at-triggers
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'pws_phases_touch' and tgrelid = 'public.pws_phases'::regclass) then
    create trigger pws_phases_touch before update on public.pws_phases
      for each row execute function public.pws_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'pws_verslag_secties_touch' and tgrelid = 'public.pws_verslag_secties'::regclass) then
    create trigger pws_verslag_secties_touch before update on public.pws_verslag_secties
      for each row execute function public.pws_touch_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  -- RLS op elke tabel uit dit bestand.
  foreach t in array array[
    'pws_profiles', 'pws_phases', 'pws_toets_criteria', 'pws_checklist_items', 'pws_ai_feedback',
    'pws_reviews', 'pws_attachments', 'pws_deadline_changes', 'pws_logboek', 'pws_subquestions',
    'pws_sources', 'pws_interviews', 'pws_interview_items', 'pws_verslag_secties', 'pws_notifications',
    'pws_surveys', 'pws_survey_questions', 'pws_survey_responses', 'pws_survey_answers'] loop
    execute format('alter table public.%I enable row level security', t);
    -- Anonieme bezoekers krijgen geen enkele rechtstreekse toegang.
    execute format('revoke all on table public.%I from anon', t);
  end loop;

  -- Trackertabellen: ingelogde gebruikers mogen alles.
  foreach t in array array[
    'pws_phases', 'pws_toets_criteria', 'pws_checklist_items', 'pws_ai_feedback', 'pws_reviews',
    'pws_attachments', 'pws_logboek', 'pws_subquestions', 'pws_sources', 'pws_interviews',
    'pws_interview_items', 'pws_verslag_secties'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_all') then
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        t || '_all', t);
    end if;
  end loop;
end $$;

-- Wijzigingsgeschiedenis: alleen lezen; schrijven gaat via pws_notify_change.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_deadline_changes' and policyname = 'pws_deadline_changes_select') then
    create policy pws_deadline_changes_select on public.pws_deadline_changes
      for select to authenticated using (true);
  end if;
end $$;
revoke insert, update, delete, truncate on table public.pws_deadline_changes from authenticated;

-- Profielen: iedereen in de groep mag profielen zien; je eigen naam aanpassen mag,
-- je eigen rol niet (anders kan een leerling zichzelf beoordelaar maken).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_profiles' and policyname = 'pws_profiles_select') then
    create policy pws_profiles_select on public.pws_profiles
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_profiles' and policyname = 'pws_profiles_update_self') then
    create policy pws_profiles_update_self on public.pws_profiles
      for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
  end if;
end $$;
revoke insert, update, delete, truncate on table public.pws_profiles from authenticated;
grant select on table public.pws_profiles to authenticated;
grant update (full_name) on table public.pws_profiles to authenticated;

-- Meldingen: alleen je eigen meldingen lezen en als gelezen markeren. Aanmaken gaat via
-- security-definer-functies.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_notifications' and policyname = 'pws_notifications_select_own') then
    create policy pws_notifications_select_own on public.pws_notifications
      for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_notifications' and policyname = 'pws_notifications_update_own') then
    create policy pws_notifications_update_own on public.pws_notifications
      for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_notifications' and policyname = 'pws_notifications_delete_own') then
    create policy pws_notifications_delete_own on public.pws_notifications
      for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;
revoke insert, update, truncate on table public.pws_notifications from authenticated;
grant select, delete on table public.pws_notifications to authenticated;
grant update (read) on table public.pws_notifications to authenticated;

-- Enquêtes en vragen: ingelogde gebruikers beheren ze. Verwijderen kan alleen zolang er nog
-- geen reacties/antwoorden zijn, zodat reacties nooit (via cascade) verloren gaan.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_surveys' and policyname = 'pws_surveys_select') then
    create policy pws_surveys_select on public.pws_surveys for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_surveys' and policyname = 'pws_surveys_insert') then
    create policy pws_surveys_insert on public.pws_surveys for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_surveys' and policyname = 'pws_surveys_update') then
    create policy pws_surveys_update on public.pws_surveys for update to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_surveys' and policyname = 'pws_surveys_delete_zonder_reacties') then
    create policy pws_surveys_delete_zonder_reacties on public.pws_surveys for delete to authenticated
      using (not exists (select 1 from public.pws_survey_responses r where r.survey_id = pws_surveys.id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_survey_questions' and policyname = 'pws_survey_questions_select') then
    create policy pws_survey_questions_select on public.pws_survey_questions for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_survey_questions' and policyname = 'pws_survey_questions_insert') then
    create policy pws_survey_questions_insert on public.pws_survey_questions for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_survey_questions' and policyname = 'pws_survey_questions_update') then
    create policy pws_survey_questions_update on public.pws_survey_questions for update to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_survey_questions' and policyname = 'pws_survey_questions_delete_zonder_antwoorden') then
    create policy pws_survey_questions_delete_zonder_antwoorden on public.pws_survey_questions for delete to authenticated
      using (not exists (select 1 from public.pws_survey_answers a where a.question_id = pws_survey_questions.id));
  end if;

  -- Reacties en antwoorden: alleen lezen. Indienen gaat via pws_enquete_indienen.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_survey_responses' and policyname = 'pws_survey_responses_select') then
    create policy pws_survey_responses_select on public.pws_survey_responses for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pws_survey_answers' and policyname = 'pws_survey_answers_select') then
    create policy pws_survey_answers_select on public.pws_survey_answers for select to authenticated using (true);
  end if;
end $$;
revoke insert, update, delete, truncate on table public.pws_survey_responses from authenticated;
revoke insert, update, delete, truncate on table public.pws_survey_answers from authenticated;
grant select on table public.pws_survey_responses to authenticated;
grant select on table public.pws_survey_answers to authenticated;

-- ---------------------------------------------------------------------------
-- Enquêtefuncties (oorspronkelijke versies; latere migraties vervangen ze met create or replace)
-- ---------------------------------------------------------------------------
-- Alleen aanmaken als ze nog niet bestaan: zo zet een herhaalde run van deze migratie de nieuwere
-- versies uit latere migraties nooit terug.
do $do$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'pws_enquete_public') then
    execute $fn$
create or replace function public.pws_enquete_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_survey record; v_questions jsonb;
begin
  select * into v_survey from public.pws_surveys where share_token = p_token and status = 'open';
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'text', q.text, 'type', q.type, 'options', q.options, 'required', q.required
    ) order by q.order_index), '[]'::jsonb)
  into v_questions from public.pws_survey_questions q where q.survey_id = v_survey.id;
  return jsonb_build_object('title', v_survey.title, 'intro', v_survey.intro, 'questions', v_questions);
end $$
    $fn$;
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'pws_enquete_indienen') then
    execute $fn$
create or replace function public.pws_enquete_indienen(p_token text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_survey_id uuid; v_response_id uuid; a jsonb;
begin
  select id into v_survey_id from public.pws_surveys where share_token = p_token and status = 'open';
  if v_survey_id is null then return jsonb_build_object('ok', false, 'error', 'gesloten'); end if;
  insert into public.pws_survey_responses(survey_id) values (v_survey_id) returning id into v_response_id;
  for a in select * from jsonb_array_elements(p_answers) loop
    if exists (
      select 1 from public.pws_survey_questions q
      where q.id = (a->>'question_id')::uuid and q.survey_id = v_survey_id
    ) then
      insert into public.pws_survey_answers(response_id, question_id, value)
      values (v_response_id, (a->>'question_id')::uuid, left(a->>'value', 2000));
    end if;
  end loop;
  return jsonb_build_object('ok', true);
end $$
    $fn$;
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'pws_enquete_stats') then
    execute $fn$
create or replace function public.pws_enquete_stats(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_total int; v_counts jsonb; v_open jsonb;
begin
  if auth.uid() is null then return null; end if;
  select count(*) into v_total from public.pws_survey_responses where survey_id = p_survey_id;
  select coalesce(jsonb_agg(jsonb_build_object('question_id', qid, 'value', val, 'n', c)), '[]'::jsonb)
    into v_counts
    from (
      select a.question_id qid, a.value val, count(*) c
      from public.pws_survey_answers a
      join public.pws_survey_responses r on r.id = a.response_id
      where r.survey_id = p_survey_id
      group by a.question_id, a.value
    ) t;
  select coalesce(jsonb_agg(jsonb_build_object('question_id', question_id, 'value', value)), '[]'::jsonb)
    into v_open
    from (
      select a.question_id, a.value
      from public.pws_survey_answers a
      join public.pws_survey_responses r on r.id = a.response_id
      join public.pws_survey_questions q on q.id = a.question_id
      where r.survey_id = p_survey_id and q.type = 'open'
      order by r.created_at
      limit 1000
    ) o;
  return jsonb_build_object('total', v_total, 'counts', v_counts, 'open', v_open);
end $$
    $fn$;
  end if;
end $do$;

-- ---------------------------------------------------------------------------
-- Meldingen en reminders
-- ---------------------------------------------------------------------------

-- Planningswijziging vastleggen en de leerling(en) een melding geven.
-- Alleen voor beoordelaars (rol is niet 'student'). Geeft de ontvangers terug voor de e-mail.
create or replace function public.pws_notify_change(p_phase_id uuid, p_field text, p_old text, p_new text)
returns table (email text, full_name text, phase_title text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_title text; v_label text;
begin
  if auth.uid() is null
     or not exists (select 1 from public.pws_profiles p where p.id = auth.uid() and p.role <> 'student') then
    raise exception 'geen rechten';
  end if;

  select ph.title into v_title from public.pws_phases ph where ph.id = p_phase_id;
  if v_title is null then raise exception 'onbekende fase'; end if;

  insert into public.pws_deadline_changes (phase_id, field, old_value, new_value, changed_by)
  values (p_phase_id, left(p_field, 50), left(p_old, 500), left(p_new, 500), auth.uid());

  v_label := case p_field
    when 'deadline' then 'Deadline'
    when 'start_date' then 'Startdatum'
    when 'title' then 'Titel'
    else p_field end;

  return query
  with ontvangers as (
    select p.id, p.email, p.full_name from public.pws_profiles p where p.role = 'student'
  ), ins as (
    insert into public.pws_notifications (user_id, type, title, body, link)
    select o.id, 'deadline_change', 'Planning gewijzigd: ' || v_title,
           v_label || ': ' || coalesce(p_old, '—') || ' → ' || coalesce(p_new, '—'),
           '/fase/' || p_phase_id::text
    from ontvangers o
    returning user_id
  )
  select o.email, o.full_name, v_title from ontvangers o where o.id in (select user_id from ins);
end $$;

-- Melding naar alle gebruikers met een bepaalde rol. 'student' = de leerling(en);
-- elke andere waarde ('ouder', 'begeleider') = alle beoordelaars (iedereen die geen student is).
-- De aanroeper zelf krijgt geen melding. Geeft de ontvangers terug voor de e-mail.
create or replace function public.pws_notify_role(p_role text, p_type text, p_title text, p_body text, p_link text)
returns table (email text, full_name text)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'niet ingelogd'; end if;
  if p_type not in ('deadline_change', 'reminder', 'system') then raise exception 'ongeldig meldingstype'; end if;

  return query
  with ontvangers as (
    select p.id, p.email, p.full_name from public.pws_profiles p
    where p.id <> auth.uid()
      and (case when p_role = 'student' then p.role = 'student' else p.role <> 'student' end)
  ), ins as (
    insert into public.pws_notifications (user_id, type, title, body, link)
    select o.id, p_type, left(coalesce(p_title, ''), 300), left(p_body, 2000), left(p_link, 500)
    from ontvangers o
    returning user_id
  )
  select o.email, o.full_name from ontvangers o where o.id in (select user_id from ins);
end $$;

-- Dagelijkse reminders (cron, met de anon-sleutel): fasen die niet klaar zijn en over 1 of 2 dagen
-- (Europe/Amsterdam) hun deadline hebben. Per gebruiker, fase en dag maar één melding, zodat een
-- herhaalde aanroep niets dubbel verstuurt en geen gegevens meer teruggeeft.
create or replace function public.pws_run_reminders()
returns table (email text, full_name text, phase_title text, deadline date, days_left integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_vandaag date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  return query
  with kandidaten as (
    select pr.id as user_id, pr.email, pr.full_name, ph.id as phase_id, ph.title, ph.deadline,
           (ph.deadline - v_vandaag)::int as dagen
    from public.pws_phases ph
    cross join public.pws_profiles pr
    where ph.status <> 'klaar'
      and ph.deadline is not null
      and (ph.deadline - v_vandaag) in (1, 2)
      and not exists (
        select 1 from public.pws_notifications n
        where n.user_id = pr.id and n.type = 'reminder'
          and n.link = '/fase/' || ph.id::text
          and (n.created_at at time zone 'Europe/Amsterdam')::date = v_vandaag
      )
  ), ins as (
    insert into public.pws_notifications (user_id, type, title, body, link)
    select k.user_id, 'reminder',
           'Deadline ' || case when k.dagen = 1 then 'morgen' else 'over ' || k.dagen || ' dagen' end || ': ' || k.title,
           'De fase ' || k.title || ' heeft een deadline op ' || to_char(k.deadline, 'DD-MM-YYYY') || '.',
           '/fase/' || k.phase_id::text
    from kandidaten k
    returning user_id, link
  )
  select k.email, k.full_name, k.title, k.deadline, k.dagen
  from kandidaten k
  join ins on ins.user_id = k.user_id and ins.link = '/fase/' || k.phase_id::text;
end $$;

-- ---------------------------------------------------------------------------
-- Rechten op functies
-- ---------------------------------------------------------------------------
revoke all on function public.pws_touch_updated_at() from public, anon, authenticated;
revoke all on function public.pws_handle_new_user() from public, anon, authenticated;

revoke all on function public.pws_enquete_public(text) from public;
revoke all on function public.pws_enquete_indienen(text, jsonb) from public;
grant execute on function public.pws_enquete_public(text) to anon, authenticated;
grant execute on function public.pws_enquete_indienen(text, jsonb) to anon, authenticated;

revoke all on function public.pws_enquete_stats(uuid) from public, anon;
grant execute on function public.pws_enquete_stats(uuid) to authenticated;

revoke all on function public.pws_notify_change(uuid, text, text, text) from public, anon;
revoke all on function public.pws_notify_role(text, text, text, text, text) from public, anon;
grant execute on function public.pws_notify_change(uuid, text, text, text) to authenticated;
grant execute on function public.pws_notify_role(text, text, text, text, text) to authenticated;

-- De cronroute roept dit aan met de anon-sleutel (zonder ingelogde gebruiker).
revoke all on function public.pws_run_reminders() from public;
grant execute on function public.pws_run_reminders() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Opslag: privébucket voor bijlagen en brondocumenten
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pws-files', 'pws-files', false)
on conflict (id) do update set public = false;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pws_files_select') then
    create policy pws_files_select on storage.objects for select to authenticated
      using (bucket_id = 'pws-files');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pws_files_insert') then
    create policy pws_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'pws-files');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pws_files_update') then
    create policy pws_files_update on storage.objects for update to authenticated
      using (bucket_id = 'pws-files') with check (bucket_id = 'pws-files');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pws_files_delete') then
    create policy pws_files_delete on storage.objects for delete to authenticated
      using (bucket_id = 'pws-files');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Startgegevens
-- ---------------------------------------------------------------------------
-- De 23 PWS-fasen (16 september – 11 februari) en de 54 zelf-toetscriteria stonden alleen in de
-- verloren database; titels en datums zijn niet uit de code te herleiden en worden hier dus niet
-- verzonnen. Voer ze na deze migratie handmatig in (pws_phases met order_index 1 t/m 23, daarna
-- pws_toets_criteria per fase). Verslagsecties hoeven niet te worden gevuld: de app maakt een rij
-- aan zodra een sectie wordt bewerkt.
