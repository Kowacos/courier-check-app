-- ============================================================================
-- Supabase Database Setup pro Courier Check App
-- ============================================================================
-- Tento SQL skript vytvoří potřebné tabulky pro synchronizaci dat
-- Spusť jej v Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new)

-- Smaž existující tabulky (pokud potřebuješ začít od nuly)
-- drop table if exists archive cascade;
-- drop table if exists drafts cascade;

-- ============================================================================
-- TABULKA: archive
-- Ukládá archivované dokončené kontroly
-- ============================================================================
create table if not exists archive (
  id         uuid primary key,
  data       jsonb not null,
  archived_at timestamptz not null,
  created_at  timestamptz default now()
);

-- Index pro rychlejší řazení
create index if not exists idx_archive_archived_at on archive(archived_at desc);

-- ============================================================================
-- TABULKA: drafts
-- Ukládá rozpracované kontroly
-- ============================================================================
create table if not exists drafts (
  id         uuid primary key,
  data       jsonb not null,
  updated_at  timestamptz default now()
);

-- Index pro rychlejší řazení
create index if not exists idx_drafts_updated_at on drafts(updated_at desc);

-- ============================================================================
-- RLS (Row Level Security) - VYPNUTO pro interní použití
-- ============================================================================
-- Pokud aplikaci používá více uživatelů a potřebuješ zabezpečení,
-- zapni RLS a nastav politiky

-- Vypni RLS (umožní všem přístup - vhodné pro interní použití)
alter table archive disable row level security;
alter table drafts disable row level security;

-- NEBO zapni RLS a nastav politiky pro autentizované uživatele:
-- alter table archive enable row level security;
-- alter table drafts enable row level security;
--
-- create policy "Enable all for authenticated users" on archive
--   for all using (auth.role() = 'authenticated');
--
-- create policy "Enable all for authenticated users" on drafts
--   for all using (auth.role() = 'authenticated');

-- ============================================================================
-- HOTOVO!
-- ============================================================================
-- Nyní by aplikace měla automaticky synchronizovat data s cloudem.
-- Zkontroluj konzoli prohlížeče pro případné chybové zprávy.

