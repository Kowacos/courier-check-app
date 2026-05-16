-- ===================================================================
-- DEBUG: Kontrola a oprava tabulky couriers
-- ===================================================================
-- Spusť tento SQL v Supabase SQL Editor pro kontrolu/opravu

-- 1. Zkontroluj, jestli tabulka couriers existuje
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'couriers';

-- Pokud nevidíš žádné řádky, tabulka NEEXISTUJE!
-- V tom případě spusť tento SQL:

-- ===================================================================
-- VYTVOŘ TABULKU COURIERS (pokud neexistuje)
-- ===================================================================

CREATE TABLE IF NOT EXISTS couriers (
  id              UUID PRIMARY KEY,
  data            JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_couriers_updated_at ON couriers(updated_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_couriers_updated_at ON couriers;
CREATE TRIGGER update_couriers_updated_at
  BEFORE UPDATE ON couriers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE couriers DISABLE ROW LEVEL SECURITY;

-- ===================================================================
-- ZOBRAZ VŠECHNY ZÁZNAMY V TABULCE
-- ===================================================================

SELECT id, data->>'name' as name, created_at, updated_at
FROM couriers
ORDER BY created_at DESC;

-- ===================================================================
-- SMAŽ VŠECHNY ZÁZNAMY (pokud chceš začít znovu)
-- ===================================================================

-- POZOR! Toto smaže všechny kurýry!
-- DELETE FROM couriers;

-- ===================================================================
-- SMAŽ KONKRÉTNÍ ZÁZNAM (podle ID)
-- ===================================================================

-- Nahraď 'uuid-here' za skutečné ID záznamu, který chceš smazat
-- DELETE FROM couriers WHERE id = 'uuid-here';


