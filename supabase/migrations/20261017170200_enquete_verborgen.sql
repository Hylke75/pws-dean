-- Oude versies verbergen in de enquêtelijst (wissen kan via de knop 'Enquête verwijderen' of de SQL-editor).
alter table public.pws_surveys add column if not exists verborgen boolean not null default false;
update public.pws_surveys set verborgen = true where slug is null and title like 'Oud – AI en de toekomst van werk%';
