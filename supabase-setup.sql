-- ============================================================================
-- Supabase Database Setup pro Courier Check App
-- ============================================================================
-- Tento SQL skript vytvoří potřebnou tabulku pro synchronizaci dat
-- Spusť jej v Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new)

-- Smaž existující tabulku (pokud potřebuješ začít od nuly)
-- drop table if exists archive cascade;

-- ============================================================================
-- TABULKA: archive
-- Ukládá všechny uložené kontroly
-- ============================================================================
create table if not exists archive (
  id         uuid primary key,
  data       jsonb not null,
  archived_at timestamptz not null,
  created_at  timestamptz default now()
);

-- Index pro rychlejší řazení
create index if not exists idx_archive_created_at on archive(created_at desc);

-- ============================================================================
-- RLS (Row Level Security) - VYPNUTO pro interní použití
-- ============================================================================
-- Pokud aplikaci používá více uživatelů a potřebuješ zabezpečení,
-- zapni RLS a nastav politiky

-- Vypni RLS (umožní všem přístup - vhodné pro interní použití)
alter table archive disable row level security;

-- NEBO zapni RLS a nastav politiky pro autentizované uživatele:
-- alter table archive enable row level security;
--
-- create policy "Enable all for authenticated users" on archive
--   for all using (auth.role() = 'authenticated');

-- ============================================================================
-- HOTOVO!
-- ============================================================================
-- Nyní by aplikace měla automaticky synchronizovat data s cloudem.
-- Zkontroluj konzoli prohlížeče pro případné chybové zprávy.

