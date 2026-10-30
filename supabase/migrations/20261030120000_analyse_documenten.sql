-- Documenten met analyses (eigen analyses of analyses door anderen) die meetellen bij de antwoorden op de onderzoeksvragen.
create table if not exists public.pws_analyse_documenten (
  id uuid primary key default gen_random_uuid(),
  titel text not null check (length(trim(titel)) between 1 and 300),
  soort text not null check (soort in ('eigen', 'extern')),
  auteur text,
  jaar text,
  deelvraag_id uuid references public.pws_subquestions(id) on delete set null,
  bestand_pad text not null,
  bestand_naam text not null,
  samenvatting text,
  status text not null default 'bezig' check (status in ('bezig', 'klaar', 'fout')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.pws_analyse_documenten enable row level security;
revoke all on table public.pws_analyse_documenten from anon;

create policy pws_analyse_documenten_all on public.pws_analyse_documenten
  for all to authenticated using (true) with check (true);
