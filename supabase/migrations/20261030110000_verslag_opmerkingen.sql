-- Opmerkingen per hoofdstuk van het verslag (van begeleider of ouder, met reactie van de leerling).
create table if not exists public.pws_verslag_opmerkingen (
  id uuid primary key default gen_random_uuid(),
  hoofdstuk text not null,
  tekst text not null check (length(trim(tekst)) between 1 and 4000),
  auteur uuid references auth.users(id) on delete set null default auth.uid(),
  auteur_naam text,
  verwerkt boolean not null default false,
  verwerkt_op timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pws_verslag_opmerkingen_hoofdstuk on public.pws_verslag_opmerkingen (hoofdstuk, created_at);

alter table public.pws_verslag_opmerkingen enable row level security;
revoke all on table public.pws_verslag_opmerkingen from anon;

-- Lezen en afvinken: iedereen die is ingelogd. Plaatsen: alleen op eigen naam. Verwijderen: alleen eigen opmerkingen.
create policy pws_verslag_opmerkingen_select on public.pws_verslag_opmerkingen
  for select to authenticated using (true);
create policy pws_verslag_opmerkingen_insert on public.pws_verslag_opmerkingen
  for insert to authenticated with check (auteur = auth.uid());
create policy pws_verslag_opmerkingen_update on public.pws_verslag_opmerkingen
  for update to authenticated using (true) with check (true);
create policy pws_verslag_opmerkingen_delete on public.pws_verslag_opmerkingen
  for delete to authenticated using (auteur = auth.uid());

-- De begeleider leest het verslag alleen; schrijven blijft voor leerling en ouders.
create policy pws_verslag_secties_select on public.pws_verslag_secties
  for select to authenticated using (true);
alter policy pws_verslag_secties_all on public.pws_verslag_secties
  using (not exists (select 1 from public.pws_profiles p where p.id = auth.uid() and p.role = 'begeleider'))
  with check (not exists (select 1 from public.pws_profiles p where p.id = auth.uid() and p.role = 'begeleider'));
