# 🔧 NÁVOD: Oprava Supabase synchronizace

## Krok 1: Smaž staré tabulky a vytvoř novou

1. **Otevři Supabase SQL Editor:**
   https://supabase.com/dashboard/project/rtsixlupzbwdkjjecjwd/sql/new

2. **Zkopíruj a spusť tento SQL:**

```sql
-- Smaž staré tabulky
DROP TABLE IF EXISTS archives CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;

-- Vytvoř novou správnou tabulku
CREATE TABLE IF NOT EXISTS archive (
  id         UUID PRIMARY KEY,
  data       JSONB NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vytvoř index
CREATE INDEX IF NOT EXISTS idx_archive_created_at ON archive(created_at DESC);

-- Vypni RLS
ALTER TABLE archive DISABLE ROW LEVEL SECURITY;
```

3. **Klikni RUN** (nebo Ctrl+Enter)

4. **Ověř v Table Editor:**
   - Klikni na "Table Editor" v levém menu
   - Měl bys vidět pouze tabulku **archive**
   - Staré tabulky **archives** a **drafts** by měly být pryč

---

## Krok 2: Otevři aplikaci a sleduj konzoli

1. **Spusť aplikaci:** Otevři http://localhost:5173

2. **Otevři konzoli prohlížeče:** Stiskni **F12**

3. **Sleduj výpisy:**
   - ✅ Měl bys vidět: "Supabase je připojeno!"
   - ✅ Měl bys vidět: "Načítám kontroly ze Supabase..."

4. **Pokud vidíš chyby:**
   - ❌ "Supabase credentials nejsou nastaveny" → Zkontroluj soubor `.env`
   - ❌ "relation 'archive' does not exist" → Tabulka není vytvořená, opakuj Krok 1

---

## Krok 3: Otestuj ukládání

1. **Přidej testovacího kurýra:**
   - Klikni "Přidat kurýra"
   - Vyplň jméno, trasu, SPZ
   - Vyplň kontrolní body

2. **Klikni "Uložit kontrolu"**

3. **Sleduj konzoli (F12):**
   - Měl bys vidět: "💾 Ukládám kontrolu do Supabase..."
   - Měl bys vidět: "✅ Kontrola úspěšně vložena do Supabase"
   - Měl bys vidět alert: "✅ Kontrola uložena!"

4. **Ověř v Supabase:**
   - Otevři: https://supabase.com/dashboard/project/rtsixlupzbwdkjjecjwd/editor
   - Klikni na tabulku **archive**
   - Měl bys vidět tvůj nový záznam!

---

## 🐛 Řešení problémů

### Problém: "Supabase není nakonfigurováno"

**Řešení:** Zkontroluj soubor `.env` v root složce projektu:

```env
VITE_SUPABASE_URL=https://rtsixlupzbwdkjjecjwd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Po úpravě `.env` **restartuj dev server** (Ctrl+C a znovu `npm run dev`)

---

### Problém: "relation 'archive' does not exist"

**Řešení:** Tabulka není vytvořená. Spusť SQL z Kroku 1.

---

### Problém: Data se ukládají do localStorage, ale ne do Supabase

**Řešení:**
1. Otevři konzoli (F12)
2. Sleduj červené chybové zprávy
3. Pošli mi screenshot chyby

---

## ✅ Co by mělo fungovat po opravě:

1. ✅ Uložení kontroly → Data v Supabase
2. ✅ Otevření na mobilu → Stejná data
3. ✅ Historie → Vidíš všechny uložené kontroly
4. ✅ Editace → Změny se synchronizují
5. ✅ Smazání → Zmizí i ze Supabase

---

## 📱 Deployment na Vercel

Po pushnutí na GitHub nezapomeň nastavit v Vercelu environment variables:

```
VITE_SUPABASE_URL=https://rtsixlupzbwdkjjecjwd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

(Settings → Environment Variables)

---

Hotovo! Nyní by měla synchronizace fungovat. 🎉

