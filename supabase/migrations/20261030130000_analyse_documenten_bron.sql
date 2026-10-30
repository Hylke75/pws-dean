-- Een analyse door anderen krijgt automatisch een bron in de bronnenlijst; deze kolom koppelt de twee.
alter table public.pws_analyse_documenten
  add column if not exists bron_id uuid references public.pws_sources(id) on delete set null;
