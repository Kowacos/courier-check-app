-- ============================================================================
-- Supabase Database Setup pro Courier Check App
-- ============================================================================
-- Tento SQL skript vytvoří potřebnou tabulku pro synchronizaci dat
-- Spusť jej v Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new)

-- Smaž existující tabulky (pokud potřebuješ začít od nuly)
-- drop table if exists archive cascade;
-- drop table if exists couriers cascade;

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
-- TABULKA: couriers
-- Kartotéka kurýrů - základní profily
-- ============================================================================
create table if not exists couriers (
  id              uuid primary key,
  data            jsonb not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Index pro rychlejší řazení
create index if not exists idx_couriers_updated_at on couriers(updated_at desc);

-- Trigger pro automatickou aktualizaci updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_couriers_updated_at on couriers;
create trigger update_couriers_updated_at
  before update on couriers
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- RLS (Row Level Security) - VYPNUTO pro interní použití
-- ============================================================================
-- Pokud aplikaci používá více uživatelů a potřebuješ zabezpečení,
-- zapni RLS a nastav politiky

-- Vypni RLS (umožní všem přístup - vhodné pro interní použití)
alter table archive disable row level security;
alter table couriers disable row level security;

-- NEBO zapni RLS a nastav politiky pro autentizované uživatele:
-- alter table archive enable row level security;
-- alter table couriers enable row level security;
--
-- create policy "Enable all for authenticated users" on archive
--   for all using (auth.role() = 'authenticated');
--
-- create policy "Enable all for authenticated users" on couriers
--   for all using (auth.role() = 'authenticated');

-- ============================================================================
-- HOTOVO!
-- ============================================================================
-- Nyní by aplikace měla automaticky synchronizovat data s cloudem.
-- Zkontroluj konzoli prohlížeče pro případné chybové zprávy.

