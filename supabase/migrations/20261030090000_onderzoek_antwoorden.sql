-- Antwoorden op hoofd- en deelvragen, door de AI opgesteld uit de enquête- en interviewdata.
-- Bevat (geparafraseerde) interviewinhoud, dus alleen voor wie de interviewmodule mag beheren.
create table if not exists public.pws_onderzoek_antwoorden (
  id uuid primary key default gen_random_uuid(),
  resultaat jsonb not null,
  basis jsonb not null default '{}'::jsonb,
  model text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.pws_onderzoek_antwoorden enable row level security;
revoke all on table public.pws_onderzoek_antwoorden from anon;

drop policy if exists pws_onderzoek_antwoorden_beheer on public.pws_onderzoek_antwoorden;
create policy pws_onderzoek_antwoorden_beheer on public.pws_onderzoek_antwoorden
  for all to authenticated
  using (public.pws_iv_mag_beheren())
  with check (public.pws_iv_mag_beheren());
