# 📋 Aplikace pro kontrolu kurýrů

Jednoduchá webová aplikace pro evidenci kontrol kurýrů s automatickou synchronizací do cloudu.

## 🚀 Jak to funguje

### 1. **Kontrola**
- Přidáš kurýry a vyplníš kontrolní body
- Klikneš **"Uložit kontrolu"**
- Hotovo!

### 2. **Historie**
- Všechny uložené kontroly
- Možnost upravit starou kontrolu
- Tisknout PDF reporty
- Objednávka uniforem

### 3. **Statistiky**
- Grafy a trendy v čase
- Top kurýři/trasy s výhradami
- Porovnání období

## 📱 Synchronizace

Data se automaticky ukládají do **Supabase** cloudu, takže můžeš pracovat na mobilu, tabletu i počítači - všude máš aktuální data.

## 🔧 Nastavení

### 1. Vytvoř tabulku v Supabase

Jdi na: https://supabase.com/dashboard/project/rtsixlupzbwdkjjecjwd/sql/new

Zkopíruj a spusť SQL z souboru: `supabase-setup.sql`

### 2. Spusť aplikaci

```bash
npm install
npm run dev
```

Otevři: http://localhost:5173

### 3. Deployment na Vercel

Každý push na GitHub automaticky nasadí novou verzi.

**Nezapomeň nastavit environment variables ve Vercelu:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📝 Kontrolní body

✅ Servisní kříže na balících  
✅ Třídění vrácených balíků  
✅ Čistota vozidla  
✅ Uniforma (s evidencí velikostí)  
✅ Stav vozidla  

## 🎯 Funkce

- ✅ Jednoduchá evidence kontrol
- ✅ Automatické ukládání do cloudu
- ✅ Historie všech kontrol
- ✅ PDF reporty (kontrola, uniformy, statistiky)
- ✅ Grafy a statistiky
- ✅ Offline podpora (localStorage)
- ✅ Responzivní design (mobil, tablet, PC)

---

Vytvořeno 2026 · Michal Přeček

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
