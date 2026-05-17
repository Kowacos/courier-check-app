# 🔄 PWA Automatická Aktualizace

## Jak to funguje?

### ✅ **AUTOMATICKY SE AKTUALIZUJE - Bez ručního zásahu!**

Když pushneš změny na Git/Vercel:

1. **Vercel automaticky buildne + deployuje** novou verzi
2. **Service Worker detekuje novou verzi** (kontroluje každých 60 sekund + při přepnutí tabu)
3. **Uživateli se zobrazí zelený banner** s hláškou "🎉 Nová verze je dostupná!"
4. **Uživatel klikne na "Aktualizovat"**
5. **Aplikace se automaticky refreshne** s novou verzí
6. **Hotovo!** ✅

---

## 🎬 Uživatelská zkušenost

### Co vidí uživatel:

1. **Pracuje s aplikací normálně**
2. **Po 1-2 minutách** (když pushneš na Git) se zobrazí **zelený banner nahoře uprostřed**:
   ```
   🎉 Nová verze je dostupná!
   Klikni pro aktualizaci aplikace
   [Aktualizovat] ← tlačítko
   ```
3. **Klikne na "Aktualizovat"** → Stránka se sama refreshne
4. **Má novou verzi** - automaticky!

### Pokud uživatel banner ignoruje:
- Banner zmizí po 30 sekundách
- Při příštím načtení stránky (F5 nebo zavření/otevření tabu) se aktivuje nová verze automaticky

---

## 🔧 Technické detaily

### Kontrola aktualizací:
- **Každých 60 sekund** automatická kontrola
- **Při přepnutí tabu zpět** na aplikaci
- **Při refreshi stránky** (F5)

### Service Worker lifecycle:
1. **Install** - Nový SW se stáhne, ale nečeká na aktivaci
2. **Waiting** - Čeká na potvrzení uživatele
3. **Message** - Uživatel klikne "Aktualizovat" → pošle `SKIP_WAITING`
4. **Activate** - Nový SW se aktivuje
5. **ControllerChange** - Stránka se sama refreshne
6. **Ready** - Nová verze běží!

---

## 📱 Jak to otestovat?

### 1. Lokálně:
```bash
npm run build
npm run preview
```
- Otevři v prohlížeči
- Proveď změnu v kódu
- Znovu buildni
- Po 60 sekundách se zobrazí banner

### 2. Na Vercelu:
```bash
git add .
git commit -m "feat: update něčeho"
git push
```
- Počkej 1-2 minuty na build
- Otevři aplikaci na iPadu/mobilu
- Po ~60 sekundách se zobrazí zelený banner
- Klikni "Aktualizovat"

---

## 🎨 Vzhled update banneru

```
┌────────────────────────────────────────────┐
│  🎉  Nová verze je dostupná!               │
│      Klikni pro aktualizaci aplikace       │
│                              [Aktualizovat] │
└────────────────────────────────────────────┘
```

- **Zelený gradient background** (emerald)
- **Bílý text** + tlačítko
- **Plynulá slideDown animace**
- **Auto-dismiss po 30s** (volitelné)

---

## 🔥 Co se stane když:

### ❓ Uživatel má aplikaci otevřenou celý den?
- ✅ Každých 60 sekund se zkontroluje update
- ✅ Zobrazí se banner když je nová verze
- ✅ Po kliknutí se refreshne

### ❓ Uživatel má aplikaci nainstalovanou jako PWA?
- ✅ Funguje stejně
- ✅ Banner se zobrazí ve standalone režimu
- ✅ Refresh funguje normálně

### ❓ Uživatel je offline?
- ✅ Použije cache (starou verzi)
- ✅ Když se připojí k netu, stáhne novou verzi
- ✅ Zobrazí banner

### ❓ Pushneš 3 verze rychle za sebou?
- ✅ Uživatel dostane banner pro nejnovější verzi
- ✅ Přeskočí middleware verze
- ✅ Všechno funguje správně

---

## 🚀 Best Practices

### Kdy pushovat na Git:
- ✅ **Večer po směně** - aby ráno byla nová verze
- ✅ **Během oběda** - minimální rušení
- ✅ **O víkendu** - příprava na další týden

### Commit messages:
```bash
git commit -m "fix: oprava filtru kurýrů s výhradami"
git commit -m "feat: přidán offline mode"
git commit -m "perf: optimalizace načítání"
```

---

## 🐛 Troubleshooting

### Banner se nezobrazuje?
1. **Zkontroluj konzoli** (F12) → mělo by být: `🆕 Nová verze PWA nalezena!`
2. **Hard refresh** (Ctrl+Shift+R nebo Cmd+Shift+R)
3. **Vyčisti cache** v DevTools → Application → Clear storage

### Stránka se nerefreshne?
1. Zkontroluj že Service Worker běží: DevTools → Application → Service Workers
2. Zkontroluj že není "Update on reload" zaškrtnuté

### Chci vynutit refresh u všech?
1. Změň `CACHE_NAME` v `sw.js` na novou verzi (např. `v3`, `v4`)
2. Push na Git
3. Všichni dostanou banner

---

## 📊 Cache strategie

### Statické soubory (HTML, CSS, JS):
- **Cache First** - rychlé načítání z cache
- Update na pozadí

### Supabase API:
- **Network First** - vždy fresh data
- Cache jako fallback pro offline

### Fotky/obrázky:
- **Cache First** - jednou stáhnou, používají z cache

---

## ✅ Shrnutí

**Ano, PWA se aktualizuje AUTOMATICKY!**

1. ✅ Push na Git → Vercel deploy
2. ✅ Service Worker detekuje update
3. ✅ Zobrazí se banner uživateli
4. ✅ Klikne "Aktualizovat"
5. ✅ Má novou verzi!

**Nemusíš dělat NIC ručně** - vše je automatické! 🎉

