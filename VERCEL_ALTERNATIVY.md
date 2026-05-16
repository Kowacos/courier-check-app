# 🔧 Alternativní způsoby nastavení Environment Variables ve Vercelu

## ZPŮSOB 1: Přes horní menu (nejnovější rozhraní 2025+)

1. Otevři svůj projekt na Vercelu
2. **Nahoře v menu** najdi záložky: Overview | Deployments | Analytics | **Settings**
3. Klikni na **Settings**
4. Hned na té stránce bys měl vidět sekce - scrolluj a hledej **Environment Variables**

---

## ZPŮSOB 2: Přes Project Settings (vpravo nahoře)

1. Otevři svůj projekt
2. **Vpravo nahoře** najdi tlačítko se **třemi tečkami ⋮** nebo ikonku **⚙️ (ozubené kolo)**
3. Vyber **Project Settings** nebo **Settings**
4. Hledej sekci **Environment Variables**

---

## ZPŮSOB 3: Přes Vercel CLI (příkazová řádka) ✅ NEJSPOLEHLIVĚJŠÍ

Pokud ti rozhraní nejde, použij příkazovou řádku - to funguje vždy!

### Krok 1: Nainstaluj Vercel CLI

```bash
npm install -g vercel
```

### Krok 2: Přihlas se

```bash
vercel login
```

### Krok 3: Jdi do složky projektu

```bash
cd C:\Users\Michaelski\WebstormProjects\courier-check-app
```

### Krok 4: Propoj projekt s Vercelem

```bash
vercel link
```

(Potvrdí automaticky správný projekt)

### Krok 5: Přidej environment variables

```bash
vercel env add VITE_SUPABASE_URL production preview
```

Po spuštění zadej hodnotu: `https://rtsixlupzbwdkjjecjwd.supabase.co`

Pak:

```bash
vercel env add VITE_SUPABASE_ANON_KEY production preview
```

Po spuštění zadej hodnotu: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c2l4bHVwemJ3ZGtqamVjandkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjczMDcsImV4cCI6MjA5NDQ0MzMwN30.KBc2TMzo8mC0RDhbh4hs-imoMt8gAEP8Jf8OYwfuhvk`

### Krok 6: Redeploy

```bash
vercel --prod
```

---

## ZPŮSOB 4: Přes vercel.json (ne doporučené pro secrets)

⚠️ **NEPOUŽÍVEJ PRO CITLIVÉ ÚDAJE!** Toto je viditelné v Git repozitáři!

Můžeš vytvořit `vercel.json`, ale secrets tam NEDÁVEJ.

---

## ZPŮSOB 5: Zkontroluj, jestli máš práva

Možná nemáš oprávnění nastavovat Environment Variables:

1. Jdi do svého projektu
2. Najdi sekci **Team** nebo **Members**
3. Zkontroluj, jestli jsi **Owner** nebo **Admin**
4. Pokud ne, požádej ownera o přidání proměnných

---

## ZPŮSOB 6: Zkus starý dashboard

Někdy můžeš přepnout na starší verze:

1. Jdi na **https://vercel.com/dashboard**
2. Najdi svůj projekt v seznamu
3. Klikni na něj
4. Mělo by se otevřít jiné rozhraní

---

## 💡 DOPORUČENÝ POSTUP PRO TEBE:

Použij **ZPŮSOB 3 - Vercel CLI**. Je to nejrychlejší a nejspolehlivější!

Jen spusť tyto příkazy v PowerShellu:

```powershell
# 1. Nainstaluj Vercel CLI
npm install -g vercel

# 2. Přihlas se
vercel login

# 3. Jdi do projektu
cd C:\Users\Michaelski\WebstormProjects\courier-check-app

# 4. Propoj projekt
vercel link

# 5. Přidej první proměnnou
vercel env add VITE_SUPABASE_URL production preview
# Zadej: https://rtsixlupzbwdkjjecjwd.supabase.co

# 6. Přidej druhou proměnnou
vercel env add VITE_SUPABASE_ANON_KEY production preview
# Zadej: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c2l4bHVwemJ3ZGtqamVjandkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjczMDcsImV4cCI6MjA5NDQ0MzMwN30.KBc2TMzo8mC0RDhbh4hs-imoMt8gAEP8Jf8OYwfuhvk

# 7. Redeploy
vercel --prod
```

---

## ✅ Výhody CLI:

- ✅ Funguje vždy, bez ohledu na verzi rozhraní
- ✅ Rychlé
- ✅ Vidíš přesně, co se děje
- ✅ Můžeš to script-ovat

---

## 🆘 Když nic nefunguje:

Kontaktuj Vercel support nebo zkus projekt reimportovat:
1. Vytvoř nový projekt na Vercelu
2. Importuj stejný GitHub repo
3. Při importu můžeš zadat Environment Variables

---

Zkus **ZPŮSOB 3 (CLI)** - je to nejspolehlivější! Dej mi vědět, jak to dopadne. 🚀

