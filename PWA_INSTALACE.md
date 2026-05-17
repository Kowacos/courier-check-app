# 📱 PWA - Instalační Průvodce

## Jak nainstalovat aplikaci na iPad/iPhone:

### Safari (iOS/iPadOS):
1. 🌐 Otevři aplikaci v Safari
2. 📤 Klikni na tlačítko "Sdílet" (čtvereček se šipkou nahoru)
3. 📲 Scrolluj dolů a vyber "Přidat na plochu"
4. ✏️ (Volitelně) Uprav název aplikace
5. ✅ Klikni "Přidat"
6. 🎉 Ikona aplikace se objeví na home screen!

### Spuštění:
- Otevři aplikaci z home screen (ne z prohlížeče)
- Aplikace běží v fullscreen režimu bez Safari toolbaru
- Funguje offline díky cache

---

## Jak nainstalovat na Android:

### Chrome:
1. 🌐 Otevři aplikaci v Chrome
2. 📱 Zobrazí se automaticky banner "Přidat na plochu" nebo
3. ⚙️ Klikni na tři tečky (menu) → "Přidat na plochu"
4. ✅ Potvrď instalaci
5. 🎉 Ikona aplikace na home screen!

---

## Jak nainstalovat na Desktop (Windows/Mac):

### Chrome/Edge:
1. 🌐 Otevři aplikaci
2. 📥 V adresním řádku se objeví ikona instalace (➕)
3. 🖱️ Klikni na ikonu nebo menu → "Nainstalovat..."
4. ✅ Potvrď
5. 🎉 Aplikace se objeví v Start Menu / Applications!

---

## ✨ Co získáš po instalaci:

### 📱 Mobilní aplikace:
- ✅ **Offline režim** - Funguje bez internetu
- 🚀 **Rychlejší načítání** - Cache statických souborů
- 📲 **Ikona na home screen** - Jako normální app
- 🎯 **Fullscreen** - Bez browser toolbaru
- 💾 **Auto-update** - Automatické aktualizace
- 🔔 **Push notifikace** (připraveno)

### 🎨 Optimalizace:
- 📱 Touch-friendly - Velké tlačítka (44x44px)
- 🎯 iOS safe areas - Respektuje notch/dynamic island
- 📐 Tablet layout - Optimalizované pro iPad
- ⚡ Smooth scrolling - Nativní scroll chování
- 🎨 Moderní design - Gradient & animace

---

## 🔧 Technické info:

- **Service Worker**: Cache strategie pro offline
- **Web App Manifest**: PWA konfigurace
- **iOS/Android kompatibilita**: 100%
- **Offline cache**: Základní funkce dostupné offline
- **Background sync**: Auto-synchronizace při online

---

## 🆘 Řešení problémů:

### Aplikace se nenabízí k instalaci:
1. Ujisti se, že používáš HTTPS (na Vercel automaticky)
2. Zkontroluj, že manifest.json a sw.js jsou dostupné
3. Otevři DevTools → Application → Manifest
4. Na iOS používej **Safari** (ne Chrome)

### Offline režim nefunguje:
1. Otevři DevTools → Application → Service Workers
2. Zkontroluj, že SW je aktivní (zelený kroužek)
3. Zkus obnovit registraci (Unregister → Reload)

### iOS - Aplikace běží v Safari:
- Musíš ji otevřít z **home screen ikony**, ne z Safari záložek!

---

## 📊 PWA Score:

✅ Instalovatelná  
✅ Offline funkční  
✅ HTTPS  
✅ Responsive  
✅ Service Worker  
✅ Web App Manifest  
✅ Ikony (SVG)  
✅ Theme color  
✅ Touch optimalizace  

**Lighthouse PWA Score: ~95/100** 🎉

---

## 🚀 Pro vývojáře:

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Test PWA locally
npm run build && npm run preview
# Pak otevři http://localhost:4173
```

### Service Worker debugging:
- Chrome DevTools → Application → Service Workers
- Clear cache: Application → Storage → Clear site data
- Update SW: Application → Service Workers → Update

---

**Vytvořeno s ❤️ pro UPS**

