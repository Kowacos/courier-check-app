# 🚀 Nastavení Environment Variables ve Vercelu

## ⚡ NOVÉ Vercel rozhraní (2024+)

### 1️⃣ Přihlas se do Vercelu
Jdi na: **https://vercel.com**

### 2️⃣ Vyber svůj projekt
- Měl bys vidět seznam svých projektů
- Klikni na projekt **courier-check-app** (nebo jak se jmenuje tvůj projekt)

### 3️⃣ Otevři Settings
Nahoře v menu projektu klikni na: **Settings** (záložka/tab)

### 4️⃣ Scrolluj dolů nebo najdi sekci "Environment Variables"

**V NOVÉM rozhraní:**
- **NENÍ** to v levém menu!
- **JE TO** přímo na stránce Settings
- Scrolluj dolů, dokud neuvidíš sekci **"Environment Variables"**
- Nebo použij vyhledávání (Ctrl+F) a hledej "Environment"

**NEBO pokud máš STARÉ rozhraní:**
- V levém menu klikni na: **Environment Variables**

### 5️⃣ Přidej proměnné

Klikni na tlačítko **"Add New"** nebo **"Add Variable"**

**Přidej tyto 2 proměnné:**

#### První proměnná:
- **Key (Název):** `VITE_SUPABASE_URL`
- **Value (Hodnota):** `https://rtsixlupzbwdkjjecjwd.supabase.co`
- **Environments:** ✅ Production, ✅ Preview (zaškrtni obě)
- Klikni **Save**

#### Druhá proměnná:
- **Key (Název):** `VITE_SUPABASE_ANON_KEY`
- **Value (Hodnota):** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c2l4bHVwemJ3ZGtqamVjandkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjczMDcsImV4cCI6MjA5NDQ0MzMwN30.KBc2TMzo8mC0RDhbh4hs-imoMt8gAEP8Jf8OYwfuhvk`
- **Environments:** ✅ Production, ✅ Preview (zaškrtni obě)
- Klikni **Save**

### 6️⃣ Redeploy aplikaci

Po přidání proměnných **MUSÍŠ** redeploy aplikaci:

**Možnost A - Automaticky (doporučené):**
- Udělej commit a push na GitHub
- Vercel automaticky vytvoří nový deployment s novými proměnnými

**Možnost B - Manuálně:**
- V projektu klikni na **Deployments** (záložka nahoře)
- Najdi poslední deployment
- Klikni na tři tečky ⋮ vedle něj
- Vyber **Redeploy**
- Potvrď

### 7️⃣ Ověř, že to funguje

Po redeploymentu:
- Otevři svou aplikaci na Vercelu (tvoje-app.vercel.app)
- Stiskni F12 (otevře se konzole)
- Měl bys vidět: "✅ Supabase je připojeno!"

---

## 🎯 Rychlá navigace ve Vercelu:

```
Dashboard → Vyber projekt → Settings → Environment Variables → Add New
```

---

## 📸 Takto to vypadá:

**Environment Variables stránka:**
```
┌─────────────────────────────────────────────────────┐
│ Environment Variables                                │
├─────────────────────────────────────────────────────┤
│                                                       │
│  [Add New] button                                    │
│                                                       │
│  KEY                          VALUE      ENVIRONMENTS│
│  ─────────────────────────── ────────── ────────────│
│  VITE_SUPABASE_URL           https://…   Prod + Prev│
│  VITE_SUPABASE_ANON_KEY      eyJhbGc…   Prod + Prev│
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ Důležité:

1. **Název proměnné MUSÍ začínat `VITE_`** - to je důležité pro Vite!
2. **Zaškrtni obě "Production" i "Preview"** - jinak to nebude fungovat
3. **Po přidání MUSÍŠ udělat redeploy** - staré deploymenty nemají nové proměnné

---

## 🐛 Když to nefunguje:

**Problém:** Po redeploymentu stále vidím "Supabase není nakonfigurováno"

**Řešení:**
1. Zkontroluj, že názvy jsou **PŘESNĚ** `VITE_SUPABASE_URL` a `VITE_SUPABASE_ANON_KEY`
2. Zkontroluj, že hodnoty jsou **bez úvozovek**
3. Zkontroluj, že máš zaškrtnuté **Production**
4. Zkus znovu redeploy (Deployments → najdi poslední → ⋮ → Redeploy)

---

## 💡 Tip:

Pokud si nejsi jistý, jestli to funguje:
- Jdi do Deployments
- Klikni na poslední deployment
- Scrolluj dolů na "Build Logs"
- Hledej, jestli tam nejsou chyby týkající se Supabase

---

Hotovo! Po nastavení a redeploymentu by aplikace měla fungovat i na Vercelu se synchronizací do Supabase. 🎉


