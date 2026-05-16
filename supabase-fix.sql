-- ============================================================================
-- OPRAVA SUPABASE - Smazání starých tabulek a vytvoření nových
-- ============================================================================
-- Spusť tento SQL v Supabase SQL Editor
-- https://supabase.com/dashboard/project/rtsixlupzbwdkjjecjwd/sql/new

-- 1. Smaž staré tabulky (pokud existují)
DROP TABLE IF EXISTS archives CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;

-- 2. Vytvoř novou správnou tabulku archive
CREATE TABLE IF NOT EXISTS archive (
  id         UUID PRIMARY KEY,
  data       JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vytvoř index pro rychlé řazení
CREATE INDEX IF NOT EXISTS idx_archive_created_at ON archive(created_at DESC);

-- 4. Vypni RLS (Row Level Security) pro jednodušší použití
ALTER TABLE archive DISABLE ROW LEVEL SECURITY;

-- 5. Ověření - zobraz strukturu tabulky
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'archive';

-- ============================================================================
-- HOTOVO! Nyní by měla být pouze tabulka "archive" a data by se měla ukládat.
-- ============================================================================

