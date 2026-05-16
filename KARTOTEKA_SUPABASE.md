# 🚀 Napojení kartotéky kurýrů na Supabase

## ✅ Co jsem implementoval:

Kartotéka kurýrů je teď **plně napojená na Supabase** - všechna data se automaticky synchronizují mezi všemi tvými zařízeními (PC, tablet, mobil)!

---

## 📋 CO MUSÍŠ UDĚLAT (jednorázově):

### 1️⃣ Spusť aktualizovaný SQL script v Supabase

**Otevři:** https://supabase.com/dashboard/project/rtsixlupzbwdkjjecjwd/sql/new

**Zkopíruj a spusť celý obsah souboru:** `supabase-setup.sql`

Nebo zkopíruj tento SQL přímo:

```sql
-- Vytvoř tabulku pro kartotéku kurýrů
CREATE TABLE IF NOT EXISTS couriers (
  id              UUID PRIMARY KEY,
  data            JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index pro rychlejší řazení
CREATE INDEX IF NOT EXISTS idx_couriers_updated_at ON couriers(updated_at DESC);

-- Trigger pro automatickou aktualizaci updated_at
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

-- Vypni RLS (Row Level Security)
ALTER TABLE couriers DISABLE ROW LEVEL SECURITY;
```

**Klikni RUN** (nebo Ctrl+Enter)

### 2️⃣ Ověř, že tabulka byla vytvořena

1. V Supabase klikni na **Table Editor** (levé menu)
2. Měl bys vidět tabulku **couriers**
3. Měla by být prázdná (0 rows)

---

## 🎯 CO SE TEĎ DĚJE AUTOMATICKY:

### ✅ **Přidání kurýra:**
- Vyplníš formulář
- Data se uloží do **Supabase**
- Data se zálohují do **localStorage** (pro offline použití)

### ✅ **Úprava kurýra:**
- Upravíš profil
- Změny se synchronizují do **Supabase**
- Všechna zařízení mají aktuální data

### ✅ **Smazání kurýra:**
- Smažeš kurýra
- Smaže se z **Supabase**
- Zmizí ze všech zařízení

### ✅ **Načítání dat:**
- Otevřeš aplikaci na jakémkoliv zařízení
- Data se načtou z **Supabase**
- Vidíš všechny kurýry ze všech zařízení

---

## 📱 JAK TO OTESTOVAT:

### Test 1: Zkontroluj konzoli
1. Otevři aplikaci: http://localhost:5173
2. Stiskni **F12** (konzole)
3. Jdi do záložky **Kurýři**
4. Měl bys vidět: `📥 Načítám kurýry ze Supabase...`
5. A pak: `✅ Načteno kurýrů ze Supabase: 0`

### Test 2: Přidej kurýra
1. Klikni **"Přidat kurýra"**
2. Vyplň jméno, telefon, trasu...
3. Sleduj konzoli - měl bys vidět:
   - `💾 Vkládám kurýra do Supabase: [uuid]`
   - `✅ Kurýr úspěšně vložen do Supabase`

### Test 3: Zkontroluj Supabase
1. Otevři: https://supabase.com/dashboard/project/rtsixlupzbwdkjjecjwd/editor
2. Klikni na tabulku **couriers**
3. Měl bys vidět svého nového kurýra!

### Test 4: Otevři na mobilu/tabletu
1. Otevři aplikaci na jiném zařízení
2. Měl bys vidět **stejného kurýra**!
3. Přidej dalšího kurýra na mobilu
4. Refresh na PC → vidíš ho tam taky!

---

## 🔄 CO SE SYNCHRONIZUJE:

### Kartotéka kurýrů:
- ✅ Jméno a příjmení
- ✅ Telefon
- ✅ Email
- ✅ Hlavní trasa
- ✅ Hlavní vozidlo
- ✅ Poznámky
- ✅ Datum vytvoření
- ✅ Datum poslední úpravy

### Kontroly:
- ✅ Všechny uložené kontroly
- ✅ Kurýři v kontrolách
- ✅ Výsledky kontrol
- ✅ Poznámky
- ✅ Fotky k výhradám (base64)

---

## 🐛 Řešení problémů:

### "Chyba při vkládání kurýra do Supabase"
**Řešení:**
1. Zkontroluj, že tabulka `couriers` existuje v Supabase
2. Zkontroluj konzoli - jaká je přesná chyba?
3. Ověř, že RLS je vypnutý: `ALTER TABLE couriers DISABLE ROW LEVEL SECURITY;`

### "Načteno kurýrů ze Supabase: 0" (ale v localStorage jsou kurýři)
**To je OK!** Aplikace pracuje tak, že:
1. Načte data z Supabase (pokud existují)
2. Pokud ne, použije localStorage
3. Při příštím přidání/úpravě se data začnou ukládat do Supabase

**Chceš přenést stávající kurýry z localStorage do Supabase?**
- Otevři každého kurýra → Upravit profil → Uložit změny
- To ho zkopíruje do Supabase

---

## 💡 Tipy:

### Offline režim:
- Aplikace funguje i **bez internetu**
- Data se načtou z localStorage
- Po obnovení spojení se synchronizují do Supabase

### Zálohování:
- Všechna data jsou automaticky zálohovaná v Supabase
- Můžeš je exportovat z Table Editoru

### Vícero depotek:
- Pokud máš více depotek, můžeš použít **stejnou Supabase databázi**
- Všechny depotky vidí stejnou kartotéku kurýrů
- **NEBO** vytvoř samostatný Supabase projekt pro každou depotku

---

## ✅ HOTOVO!

Kartotéka kurýrů je teď plně synchronizovaná přes Supabase! 🎉

**Můžeš:**
- Přidávat kurýry na PC
- Upravovat je na tabletu
- Mazat je z mobilu
- Všude vidět aktuální data

---

**Pokud máš problém, zkontroluj konzoli (F12) - tam uvidíš přesné chybové hlášky!**

