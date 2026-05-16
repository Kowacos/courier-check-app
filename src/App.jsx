import { useEffect, useMemo, useState } from "react";
import {
  fetchArchive, insertArchiveEntry, updateArchiveEntry, deleteArchiveEntry,
  fetchCouriers, insertCourier, updateCourier, deleteCourier
} from "./supabaseService";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardCheck, FileText, Plus, Trash2, Save, RotateCcw, Search, CheckCircle2, XCircle, Printer, BarChart2, Archive, X, Shirt, PencilLine, Camera, Image as ImageIcon, User, UserPlus, TrendingUp, Award, Tag } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from "recharts";

function Button({ children, className = "", variant = "default", size = "md", ...props }) {
  const base = "inline-flex items-center justify-center rounded-2xl font-semibold transition disabled:pointer-events-none disabled:opacity-50 active:scale-95";
  const sizes = {
    sm: "px-3 py-1.5 text-xs min-h-[36px]",  // Větší min-height pro tablet
    md: "px-4 py-2 text-sm min-h-[44px]"     // Větší min-height pro tablet
  };
  const variants = {
    default: "bg-slate-950 text-white hover:bg-slate-800 active:bg-slate-900",
    outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100",
    ghost: "bg-transparent hover:bg-slate-100 active:bg-slate-200",
    destructive: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800",
    success: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100",
    blue: "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 active:bg-blue-100",
  };
  return (
    <button className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) { return <div className={`bg-white ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }) { return <div className={className}>{children}</div>; }

const STORAGE_KEY = "courier-current-v2";
const SAVED_KEY = "courier-saved-v2";
const COURIERS_DB_KEY = "couriers-database-v1";

const CHECKS = [
  { id: "serviceCrosses", title: "Servisní kříže na balících", short: "Serv. kříže", description: "Kontrola, zda jsou na balících správně vyplněné servisní kříže.", quickNotes: ["Chybějící servisní kříž","Špatně vyplněný servisní kříž","Kurýr proškolen","Opraveno na místě","Nutná opakovaná kontrola"] },
  { id: "returnsSorting", title: "Třídění vrácených balíků do klecí", short: "Vrácené balíky", description: "Kontrola správného roztřídění vrácených balíků do určených klecí.", quickNotes: ["Špatná klec","Balík ponechán mimo klec","Nedodržen postup třídění","Kurýr proškolen","Nutná opakovaná kontrola"] },
  { id: "vehicleCleanliness", title: "Čistota vozidla", short: "Čistota vozidla", description: "Kontrola kabiny i nákladového prostoru.", quickNotes: ["Nepořádek v kabině","Nepořádek v nákladovém prostoru","Zbytky obalů / odpadky","Kurýr upozorněn","Opraveno na místě"] },
  { id: "uniform", title: "Uniforma", short: "Uniforma", description: "Kontrola předepsaného vzhledu a pracovního oblečení.", quickNotes: ["Chybí část uniformy","Nevhodné oblečení","Neupravený vzhled","Kurýr upozorněn","Nutná opakovaná kontrola"] },
  { id: "vehicleCondition", title: "Stav vozidla", short: "Stav vozidla", description: "Kontrola vizuálního a technického stavu vozidla.", quickNotes: ["Poškození karoserie","Problém se světly","Problém s pneumatikami","Chybějící výbava","Nutné nahlásit závadu"] },
];

const STATUS_OPTIONS = [
  { value: "ok", label: "Vyhovuje", icon: CheckCircle2, weight: 0 },
  { value: "fail", label: "Nevyhovuje", icon: XCircle, weight: 1 },
];
const ACTION_OPTIONS = ["Bez opatření","Kurýr upozorněn","Kurýr proškolen","Opraveno na místě","Opakovaná kontrola","Předat vedoucímu"];
const UNIFORM_ITEMS = ["Triko","Košile","Kraťasy/Kalhoty","Vesta","Bunda"];
const UNIFORM_SIZES = ["XS","S","M","L","XL","XXL","3XL"];
const UNIFORM_PANTS_SIZES = ["30","32","34","36","38","40","42","44","46"];

// Dostupné tagy pro kurýry
const AVAILABLE_TAGS = [
  { id: "novacek", label: "Nováček", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "top", label: "Top performer", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "problem", label: "Potřebuje pozornost", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "training", label: "V tréninku", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "experienced", label: "Zkušený", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "temporary", label: "Brigádník", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "returning", label: "Návrátilec", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
];

function todayISO() { return new Date().toISOString().slice(0, 10); }
function formatDate(value) { if (!value) return ""; const [y, m, d] = value.split("-"); return `${d}. ${m}. ${y}`; }
function emptyChecks() { return CHECKS.reduce((acc, ch) => { acc[ch.id] = { status: "ok", note: "" }; return acc; }, {}); }

function createEmptyCourier() {
  return { id: crypto.randomUUID(), name: "", route: "", vehicle: "", checks: emptyChecks(), action: "Bez opatření", generalNote: "", uniformDetails: { size: "", pantsSize: "", missing: [], needsReorder: false }, createdAt: new Date().toISOString() };
}

function getCourierScore(courier) {
  return CHECKS.reduce((sum, ch) => sum + (STATUS_OPTIONS.find(o => o.value === (courier.checks?.[ch.id]?.status || "ok"))?.weight || 0), 0);
}
function getCourierResult(courier) {
  const s = getCourierScore(courier);
  if (s === 0) return { label: "Vyhověl", tone: "ok" };
  return { label: "Nevyhověl", tone: "fail" };
}
function statusClasses(v) {
  if (v === "ok") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}
function resultClasses(tone) {
  if (tone === "ok") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}
function computeSummary(couriers) {
  const base = { total: couriers.length, ok: 0, fail: 0, actions: {}, issues: {} };
  couriers.forEach(c => {
    const r = getCourierResult(c);
    base[r.tone] += 1;
    base.actions[c.action] = (base.actions[c.action] || 0) + 1;
    CHECKS.forEach(ch => { if ((c.checks?.[ch.id]?.status || "ok") !== "ok") base.issues[ch.short] = (base.issues[ch.short] || 0) + 1; });
  });
  return base;
}

// ─── PRINT MODAL ──────────────────────────────────────────────────────────────
// type: "inspection" | "uniform" | "stats"
function PrintModal({ data, onClose }) {
  const [tab, setTab] = useState(data.type);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const insp = data.inspection;
  const summary = insp ? computeSummary(insp.couriers) : null;

  function handlePrint() {
    // Dynamicky nastav orientaci stránky podle aktivního tabu
    const isPortrait = tab === "stats";
    const styleEl = document.createElement("style");
    styleEl.id = "__print-orientation__";
    styleEl.textContent = `@page { size: A4 ${isPortrait ? "portrait" : "landscape"}; margin: ${isPortrait ? "12mm" : "10mm"}; }`;
    document.head.appendChild(styleEl);
    window.print();
    // Odstraň po tisku
    setTimeout(() => { styleEl.remove(); }, 1000);
  }

  const tabs = [
    ...(insp ? [{ id: "inspection", label: "📋 Report kontroly", icon: FileText }] : []),
    ...(insp ? [{ id: "uniform", label: "🧥 Objednávka uniforem", icon: Shirt }] : []),
    ...(data.archive ? [{ id: "stats", label: "📊 Statistiky", icon: BarChart2 }] : []),
  ];

  return (
    <>
      {/* Screen overlay — skryje se při tisku */}
      <div className="print-modal-overlay fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm">
        {/* Modal window */}
        <div className="print-modal-window relative m-4 flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden" style={{ maxHeight: "calc(100vh - 2rem)" }}>
          {/* Sticky header — skryje se při tisku */}
          <div className="print-modal-controls flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Tisk / PDF
              </Button>
              <Button variant="outline" onClick={onClose} className="gap-2">
                <X className="h-4 w-4" /> Zavřít
              </Button>
            </div>
          </div>
          {/* Scrollable preview — tiskne se přímo toto */}
          <div className="print-modal-scroll overflow-auto p-8 bg-white">
            {tab === "inspection" && insp && <PrintableReport inspection={insp} summary={summary} />}
            {tab === "uniform" && insp && <UniformOrderPrintable inspection={insp} />}
            {tab === "stats" && data.archive && <StatsPrintable archive={data.archive} />}
          </div>
        </div>
      </div>

      {/* Print-only content — skryje se na obrazovce, zobrazí se při tisku */}
      <div className="print-show-only">
        {tab === "inspection" && insp && <PrintableReport inspection={insp} summary={summary} />}
        {tab === "uniform" && insp && <UniformOrderPrintable inspection={insp} />}
        {tab === "stats" && data.archive && <StatsPrintable archive={data.archive} />}
      </div>
    </>
  );
}

// ─── UNIFORM ORDER PRINTABLE ──────────────────────────────────────────────────
function UniformOrderPrintable({ inspection }) {
  const uniformIssues = inspection.couriers.filter(c =>
    c.checks?.uniform?.status !== "ok" || c.uniformDetails?.needsReorder
  ).filter(c =>
    (c.uniformDetails?.missing?.length > 0) || c.uniformDetails?.size || c.uniformDetails?.pantsSize
  );

  return (
    <div className="space-y-4 bg-white text-slate-950 text-sm">
      <div className="flex justify-between items-start pb-3" style={{ borderBottom: "3px solid #f59e0b" }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight">🧥 Objednávka uniforem</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{formatDate(inspection.date)} · Depo: {inspection.depot} · {inspection.inspector}</p>
        </div>
      </div>
      {uniformIssues.length === 0 ? (
        <p className="text-center py-8" style={{ color: "#94a3b8", fontStyle: "italic" }}>Žádné uniformy k objednání.</p>
      ) : (
        <>
          <table className="w-full border-collapse text-xs" style={{ border: "1px solid #fcd34d", borderRadius: "8px", overflow: "hidden" }}>
            <thead style={{ backgroundColor: "#fffbeb" }}>
              <tr>
                <th className="px-2 py-2 text-left font-semibold" style={{ borderBottom: "1px solid #fde68a" }}>Kurýr</th>
                <th className="px-2 py-2 text-left font-semibold" style={{ borderBottom: "1px solid #fde68a" }}>Trasa</th>
                <th className="px-2 py-2 text-center font-semibold" style={{ borderBottom: "1px solid #fde68a" }}>Typ</th>
                <th className="px-2 py-2 text-center font-semibold" style={{ borderBottom: "1px solid #fde68a" }}>Vel. oblečení</th>
                <th className="px-2 py-2 text-center font-semibold" style={{ borderBottom: "1px solid #fde68a" }}>Vel. kalhot</th>
                {UNIFORM_ITEMS.map(item => (
                  <th key={item} className="px-2 py-2 text-center font-semibold" style={{ borderBottom: "1px solid #fde68a" }}>{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniformIssues.map((courier, idx) => (
                <tr key={courier.id} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fffdf0" }}>
                  <td className="px-2 py-2 font-medium" style={{ borderBottom: "1px solid #fef3c7" }}>{courier.name || "Bez jména"}</td>
                  <td className="px-2 py-2" style={{ borderBottom: "1px solid #fef3c7" }}>{courier.route || "—"}</td>
                  <td className="px-2 py-2 text-center" style={{ borderBottom: "1px solid #fef3c7" }}>
                    {courier.checks?.uniform?.status !== "ok" ? (
                      <span style={{ backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: "9999px", padding: "1px 8px", fontSize: "11px", fontWeight: 700 }}>Chybí</span>
                    ) : (
                      <span style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "9999px", padding: "1px 8px", fontSize: "11px", fontWeight: 700 }}>Doplnit</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center font-bold" style={{ borderBottom: "1px solid #fef3c7" }}>{courier.uniformDetails?.size || "—"}</td>
                  <td className="px-2 py-2 text-center font-bold" style={{ borderBottom: "1px solid #fef3c7" }}>{courier.uniformDetails?.pantsSize || "—"}</td>
                  {UNIFORM_ITEMS.map(item => {
                    const needs = courier.uniformDetails?.missing?.includes(item);
                    return (
                      <td key={item} className="px-2 py-2 text-center font-bold" style={{ borderBottom: "1px solid #fef3c7", color: needs ? "#dc2626" : "#cbd5e1" }}>
                        {needs ? "✗" : "·"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot style={{ backgroundColor: "#fffbeb" }}>
              <tr>
                <td colSpan={5} className="px-2 py-2 text-xs font-semibold">Celkem kusů k objednání:</td>
                {UNIFORM_ITEMS.map(item => {
                  const cnt = uniformIssues.filter(c => c.uniformDetails?.missing?.includes(item)).length;
                  return (
                    <td key={item} className="px-2 py-2 text-center" style={{ fontWeight: 900, color: cnt > 0 ? "#92400e" : "#94a3b8" }}>
                      {cnt > 0 ? cnt : "—"}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
          <div className="flex justify-between items-end pt-4 text-xs" style={{ borderTop: "1px solid #e2e8f0", color: "#64748b" }}>
            <span>Zpracoval: <strong>{inspection.inspector}</strong> · {formatDate(inspection.date)}</span>
            <span className="flex flex-col items-center gap-1">
              <span className="inline-block w-44" style={{ borderBottom: "1px solid #94a3b8" }} />
              <span>Podpis</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── STATS PRINTABLE ──────────────────────────────────────────────────────────
function StatsPrintable({ archive }) {
  const allEntries = archive.flatMap(insp => insp.couriers.map(c => ({ ...c, inspectionDate: insp.date })));
  const totalOk = allEntries.filter(c => getCourierResult(c).tone === "ok").length;
  const totalIssues = allEntries.filter(c => getCourierResult(c).tone !== "ok").length;

  const checkCounts = CHECKS.map(ch => ({
    name: ch.short,
    pocet: allEntries.filter(c => (c.checks?.[ch.id]?.status || "ok") !== "ok").length,
  })).sort((a, b) => b.pocet - a.pocet);

  const courierMap = {};
  allEntries.forEach(c => {
    const k = c.name?.trim() || "Neznámý";
    if (!courierMap[k]) courierMap[k] = { name: k, total: 0, issues: 0 };
    courierMap[k].total += 1;
    if (getCourierResult(c).tone !== "ok") courierMap[k].issues += 1;
  });
  const routeMap = {};
  allEntries.forEach(c => {
    const k = c.route?.trim() || "Bez trasy";
    if (!routeMap[k]) routeMap[k] = { route: k, total: 0, issues: 0 };
    routeMap[k].total += 1;
    if (getCourierResult(c).tone !== "ok") routeMap[k].issues += 1;
  });

  const topCouriers = Object.values(courierMap).sort((a, b) => b.issues - a.issues).slice(0, 8);
  const topRoutes = Object.values(routeMap).sort((a, b) => b.issues - a.issues).slice(0, 8);
  const sortedArchive = [...archive].sort((a, b) => new Date(a.date) - new Date(b.date));

  const okTrendData = sortedArchive.map(insp => {
    const ok = insp.couriers.filter(c => getCourierResult(c).tone === "ok").length;
    const pct = insp.couriers.length > 0 ? Math.round(ok / insp.couriers.length * 100) : 100;
    const d = new Date(insp.date);
    return { label: `${d.getDate()}.${d.getMonth() + 1}.`, pctOk: pct };
  });

  const trendBarData = sortedArchive.slice(-14).map(insp => {
    const ok = insp.couriers.filter(c => getCourierResult(c).tone === "ok").length;
    const d = new Date(insp.date);
    return { label: `${d.getDate()}.${d.getMonth() + 1}.`, kontrolovano: insp.couriers.length, vyhrady: insp.couriers.length - ok };
  });

  const courierChartData = topCouriers.map(c => ({ name: c.name.split(" ")[0], vyhrady: c.issues, celkem: c.total }));
  const routeChartData = topRoutes.map(r => ({ name: r.route, vyhrady: r.issues, celkem: r.total }));

  const archiveTableData = sortedArchive.map((insp, idx) => {
    const ok = insp.couriers.filter(c => getCourierResult(c).tone === "ok").length;
    const pct = insp.couriers.length > 0 ? Math.round(ok / insp.couriers.length * 100) : 100;
    const prev = idx > 0 ? sortedArchive[idx - 1] : null;
    let prevPct = null;
    if (prev) {
      const prevOk = prev.couriers.filter(c => getCourierResult(c).tone === "ok").length;
      prevPct = prev.couriers.length > 0 ? Math.round(prevOk / prev.couriers.length * 100) : 100;
    }
    return { insp, pct, diff: prevPct !== null ? pct - prevPct : null };
  }).reverse();

  // Styly — společné pomocné funkce
  const sec = (extra = {}) => ({ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px", ...extra });
  const th = (extra = {}) => ({ padding: "5px 7px", borderBottom: "2px solid #e2e8f0", fontWeight: 700, backgroundColor: "#f8fafc", fontSize: "10px", textAlign: "left", ...extra });
  const td = (extra = {}) => ({ padding: "4px 7px", borderBottom: "1px solid #f1f5f9", fontSize: "10px", ...extra });
  // A4 portrait @96dpi, 12mm margins → ~700px usable; polovina ~336px
  const FULL = 690;
  const HALF = 330;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#0f172a", background: "#fff", width: "100%" }}>

      {/* ── HLAVIČKA ── */}
      <div style={{ borderBottom: "3px solid #0f172a", paddingBottom: "8px", marginBottom: "14px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 900, margin: 0 }}>📊 Statistický report</h1>
        <p style={{ fontSize: "10px", color: "#64748b", margin: "3px 0 0" }}>
          Vygenerováno {formatDate(todayISO())} · {archive.length} kontrol · {allEntries.length} kurýrů celkem
        </p>
      </div>

      {/* ── SOUHRN — 4 dlaždice pomocí tabulky ── */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: "14px", borderCollapse: "separate", borderSpacing: "8px" }}>
        <tbody><tr>
          {[
            { label: "Kontrol celkem", value: archive.length, bg: "#f8fafc", border: "#94a3b8", color: "#0f172a" },
            { label: "Kurýrů celkem", value: allEntries.length, bg: "#f8fafc", border: "#94a3b8", color: "#0f172a" },
            { label: "✓ Bez výhrad", value: totalOk, bg: "#f0fdf4", border: "#86efac", color: "#16a34a" },
            { label: "⚠ S výhradou / nevyhověl", value: totalIssues, bg: "#fffbeb", border: "#fcd34d", color: "#b45309" },
          ].map(s => (
            <td key={s.label} width="25%" style={{ backgroundColor: s.bg, border: `2px solid ${s.border}`, borderRadius: "10px", padding: "10px", textAlign: "center", verticalAlign: "middle" }}>
              <div style={{ fontSize: "24px", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#475569", marginTop: "4px" }}>{s.label}</div>
            </td>
          ))}
        </tr></tbody>
      </table>

      {/* ── TREND % OK — plná šířka line chart ── */}
      <div style={{ ...sec({ border: "2px solid #0f172a", marginBottom: "14px" }) }}>
        <div style={{ fontSize: "13px", fontWeight: 800, marginBottom: "2px" }}>📈 Trend % OK v čase — zlepšení / zhoršení</div>
        <div style={{ fontSize: "9px", color: "#64748b", marginBottom: "8px" }}>Čím vyšší křivka, tím lepší výsledky. Cíl: udržet nad 80 %.</div>
        {okTrendData.length > 1 ? (
          <LineChart width={FULL} height={140} data={okTrendData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 8 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 8 }} tickFormatter={v => `${v}%`} width={34} />
            <Tooltip formatter={v => `${v}%`} />
            <Line type="monotone" dataKey="pctOk" name="% OK" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3, fill: "#16a34a" }} />
          </LineChart>
        ) : (
          <p style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "10px" }}>Potřeba alespoň 2 kontroly pro zobrazení trendu.</p>
        )}
      </div>

      {/* ── ŘÁDEK 1: Výhrady v čase | Typy chyb ── */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: "14px" }}>
        <tbody><tr valign="top">
          <td width="50%" style={{ paddingRight: "7px" }}>
            <div style={sec()}>
              <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>Výhrady vs. kontrolováno</div>
              {trendBarData.length > 0 ? (
                <BarChart width={HALF} height={140} data={trendBarData} margin={{ top: 2, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 7 }} />
                  <YAxis tick={{ fontSize: 7 }} allowDecimals={false} width={28} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "8px" }} />
                  <Bar dataKey="kontrolovano" name="Kontrolováno" fill="#94a3b8" radius={[2,2,0,0]} />
                  <Bar dataKey="vyhrady" name="Výhrady" fill="#f59e0b" radius={[2,2,0,0]} />
                </BarChart>
              ) : <p style={{ color: "#94a3b8", fontSize: "10px" }}>Nedostatek dat.</p>}
            </div>
          </td>
          <td width="50%" style={{ paddingLeft: "7px" }}>
            <div style={sec()}>
              <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>Nejčastější typy chyb</div>
              <BarChart width={HALF} height={140} data={checkCounts} layout="vertical" margin={{ top: 2, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 7 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 7 }} width={86} />
                <Tooltip />
                <Bar dataKey="pocet" name="Počet" fill="#f59e0b" radius={[0,3,3,0]} />
              </BarChart>
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── ŘÁDEK 2: Top kurýři | Top trasy ── */}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: "14px" }}>
        <tbody><tr valign="top">
          <td width="50%" style={{ paddingRight: "7px" }}>
            <div style={sec()}>
              <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>Top kurýři — nejvíce výhrad</div>
              {courierChartData.length > 0 ? (
                <BarChart width={HALF} height={160} data={courierChartData} layout="vertical" margin={{ top: 2, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 7 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 7 }} width={66} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "8px" }} />
                  <Bar dataKey="celkem" name="Celkem" fill="#e2e8f0" radius={[0,3,3,0]} />
                  <Bar dataKey="vyhrady" name="Výhrady" fill="#f59e0b" radius={[0,3,3,0]} />
                </BarChart>
              ) : <p style={{ color: "#94a3b8", fontSize: "10px", fontStyle: "italic" }}>Žádná data.</p>}
            </div>
          </td>
          <td width="50%" style={{ paddingLeft: "7px" }}>
            <div style={sec()}>
              <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>Top trasy — nejvíce výhrad</div>
              {routeChartData.length > 0 ? (
                <BarChart width={HALF} height={160} data={routeChartData} layout="vertical" margin={{ top: 2, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 7 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 7 }} width={66} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "8px" }} />
                  <Bar dataKey="celkem" name="Celkem" fill="#e2e8f0" radius={[0,3,3,0]} />
                  <Bar dataKey="vyhrady" name="Výhrady" fill="#f43f5e" radius={[0,3,3,0]} />
                </BarChart>
              ) : <p style={{ color: "#94a3b8", fontSize: "10px", fontStyle: "italic" }}>Žádná data.</p>}
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── TABULKY: Historie + Typy chyb ── */}
      <table width="100%" cellPadding="0" cellSpacing="0">
        <tbody><tr valign="top">

          {/* Historie kontrol */}
          <td width="62%" style={{ paddingRight: "7px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Historie kontrol — porovnání v čase</div>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse", border: "1px solid #e2e8f0" }}>
              <thead>
                <tr>
                  {["Datum","Směna","Kurýrů","Výhrad","% OK","Změna"].map(h => (
                    <th key={h} style={th({ textAlign: h === "Datum" || h === "Směna" ? "left" : "center" })}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {archiveTableData.map(({ insp, pct, diff }, i) => {
                  const issues = insp.couriers.length - insp.couriers.filter(c => getCourierResult(c).tone === "ok").length;
                  const pctColor = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
                  const diffEl = diff === null ? "—"
                    : diff > 0 ? <span style={{ color: "#16a34a", fontWeight: 700 }}>↑ +{diff}%</span>
                    : diff < 0 ? <span style={{ color: "#dc2626", fontWeight: 700 }}>↓ {diff}%</span>
                    : <span style={{ color: "#94a3b8" }}>= 0%</span>;
                  return (
                    <tr key={insp.archivedAt} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={td()}>{formatDate(insp.date)}</td>
                      <td style={td()}>{insp.shift}</td>
                      <td style={td({ textAlign: "center", fontWeight: 700 })}>{insp.couriers.length}</td>
                      <td style={td({ textAlign: "center", fontWeight: 700, color: issues > 0 ? "#d97706" : "#16a34a" })}>{issues}</td>
                      <td style={td({ textAlign: "center", fontWeight: 800, color: pctColor })}>{pct}%</td>
                      <td style={td({ textAlign: "center" })}>{diffEl}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </td>

          {/* Typy chyb + Top kurýři */}
          <td width="38%" style={{ paddingLeft: "7px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Přehled chyb dle typu</div>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
              <thead>
                <tr>
                  {["Kontrolní bod","Výhrad","%"].map(h => (
                    <th key={h} style={th({ textAlign: h === "Kontrolní bod" ? "left" : "center" })}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checkCounts.map((ch, i) => (
                  <tr key={ch.name} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={td({ fontWeight: 500 })}>{ch.name}</td>
                    <td style={td({ textAlign: "center", fontWeight: 700, color: ch.pocet > 0 ? "#d97706" : "#94a3b8" })}>{ch.pocet}</td>
                    <td style={td({ textAlign: "center" })}>{allEntries.length > 0 ? Math.round(ch.pocet / allEntries.length * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>Top kurýři — výhrady</div>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse", border: "1px solid #e2e8f0" }}>
              <thead>
                <tr>
                  {["Kurýr","Výhrad","% chyb"].map(h => (
                    <th key={h} style={th({ textAlign: h === "Kurýr" ? "left" : "center" })}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCouriers.map((c, i) => (
                  <tr key={c.name} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={td({ fontWeight: 500 })}>{c.name}</td>
                    <td style={td({ textAlign: "center", fontWeight: 700, color: "#d97706" })}>{c.issues}</td>
                    <td style={td({ textAlign: "center" })}>{Math.round(c.issues / c.total * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>

        </tr></tbody>
      </table>
    </div>
  );
}

// ─── PRINTABLE REPORT ─────────────────────────────────────────────────────────
function PrintableReport({ inspection, summary }) {
  const sym = (status) => {
    if (status === "ok") return { s: "✓", cls: "text-emerald-700 font-bold" };
    return { s: "✗", cls: "text-rose-600 font-bold" };
  };
  const couriersWithNotes = inspection.couriers.filter(c => CHECKS.some(ch => c.checks?.[ch.id]?.note) || c.generalNote);

  return (
    <div className="space-y-4 bg-white text-slate-950 text-sm">
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Report kontroly kurýrů</h1>
          <p className="text-slate-500 text-xs mt-0.5">Automaticky generováno · {formatDate(inspection.date)}</p>
        </div>
        <div className="text-right text-xs text-slate-600 space-y-0.5">
          <div><strong>Depo:</strong> {inspection.depot}</div>
          <div><strong>Kontrolující:</strong> {inspection.inspector}</div>
          <div><strong>Směna:</strong> {inspection.shift}</div>
          {inspection.note && <div className="max-w-xs"><strong>Pozn.:</strong> {inspection.note}</div>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[{ label: "Kontrolováno", value: summary.total, cls: "border-slate-300" }, { label: "✓ Vyhovělo", value: summary.ok, cls: "border-emerald-300 bg-emerald-50" }, { label: "✗ Nevyhověl", value: summary.fail, cls: "border-rose-300 bg-rose-50" }].map(s => (
          <div key={s.label} className={`border rounded-xl p-2 text-center ${s.cls}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-medium text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Přehled kurýrů */}
        <div className="overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold">Kurýr</th>
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold">Trasa</th>
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold">Vozidlo</th>
                {CHECKS.map(ch => <th key={ch.id} className="border-b border-slate-300 px-1.5 py-1.5 font-semibold text-center">{ch.short}</th>)}
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold text-center">Výsledek</th>
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold">Opatření</th>
              </tr>
            </thead>
            <tbody>
              {inspection.couriers.length === 0 && <tr><td colSpan={3 + CHECKS.length + 2} className="p-3 text-center text-slate-400 italic">Žádný kurýr.</td></tr>}
              {inspection.couriers.map((courier, idx) => {
                const result = getCourierResult(courier);
                return (
                  <tr key={courier.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="border-b border-slate-200 px-2 py-1.5 font-medium">{courier.name || "Bez jména"}</td>
                    <td className="border-b border-slate-200 px-2 py-1.5">{courier.route || "—"}</td>
                    <td className="border-b border-slate-200 px-2 py-1.5">{courier.vehicle || "—"}</td>
                    {CHECKS.map(ch => { const { s, cls } = sym(courier.checks?.[ch.id]?.status || "ok"); return <td key={ch.id} className={`border-b border-slate-200 px-1.5 py-1.5 text-center ${cls}`}>{s}</td>; })}
                    <td className={`border-b border-slate-200 px-2 py-1.5 text-center font-bold ${result.tone === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{result.label}</td>
                    <td className="border-b border-slate-200 px-2 py-1.5">{courier.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span><strong className="text-emerald-700">✓</strong> V pořádku</span><span><strong className="text-rose-600">✗</strong> Nevyhovuje</span>
        <span className="ml-auto italic">Serv. kříže · Vrácené balíky · Čistota vozidla · Uniforma · Stav vozidla</span>
      </div>

      {couriersWithNotes.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-1.5">Poznámky k výhradám</h2>
          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-100"><tr><th className="border-b border-slate-300 px-2 py-1.5 font-semibold w-32 text-left">Kurýr</th><th className="border-b border-slate-300 px-2 py-1.5 font-semibold w-32 text-left">Bod</th><th className="border-b border-slate-300 px-2 py-1.5 font-semibold text-left">Poznámka</th></tr></thead>
              <tbody>
                {couriersWithNotes.flatMap(courier => [
                  ...CHECKS.filter(ch => courier.checks?.[ch.id]?.note).map(ch => (
                    <tr key={courier.id + ch.id} className="odd:bg-white even:bg-slate-50">
                      <td className="border-b border-slate-200 px-2 py-1 font-medium">{courier.name || "Bez jména"}</td>
                      <td className="border-b border-slate-200 px-2 py-1">{ch.short}</td>
                      <td className="border-b border-slate-200 px-2 py-1 whitespace-pre-wrap">{courier.checks[ch.id].note}</td>
                    </tr>
                  )),
                  ...(courier.generalNote ? [<tr key={courier.id + "_g"} className="odd:bg-white even:bg-slate-50"><td className="border-b border-slate-200 px-2 py-1 font-medium">{courier.name || "Bez jména"}</td><td className="border-b border-slate-200 px-2 py-1 italic text-slate-500">Obecná</td><td className="border-b border-slate-200 px-2 py-1 whitespace-pre-wrap">{courier.generalNote}</td></tr>] : []),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs text-slate-500">
        <span>Zpracoval: <strong>{inspection.inspector}</strong> · {formatDate(inspection.date)} · Depo: {inspection.depot}</span>
        <span className="flex flex-col items-center gap-1"><span className="inline-block w-44 border-b border-slate-400" /><span>Podpis kontrolující osoby</span></span>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function CourierCheckApp() {
  const [inspection, setInspection] = useState(() => ({
    date: todayISO(), depot: "Tucho", inspector: "Michal Přeček", shift: "Odpolední kontrola", note: "", couriers: [],
  }));
  const [activeCourierId, setActiveCourierId] = useState(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("check");
  const [printModal, setPrintModal] = useState(null);
  const [savedInspections, setSavedInspections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [couriersDB, setCouriersDB] = useState([]); // Kartotéka kurýrů
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [editingCourierData, setEditingCourierData] = useState(null);
  const [showSelectCouriersModal, setShowSelectCouriersModal] = useState(false);

  // Načti data při startu
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Načti uložené kontroly z Supabase
        const savedData = await fetchArchive();
        if (savedData) {
          setSavedInspections(savedData);
          localStorage.setItem(SAVED_KEY, JSON.stringify(savedData));
        } else {
          // Fallback na localStorage
          const s = localStorage.getItem(SAVED_KEY);
          if (s) setSavedInspections(JSON.parse(s));
        }

        // Načti kartotéku kurýrů z Supabase
        const couriersData = await fetchCouriers();
        if (couriersData) {
          setCouriersDB(couriersData);
          localStorage.setItem(COURIERS_DB_KEY, JSON.stringify(couriersData));
        } else {
          // Fallback na localStorage
          const couriersStr = localStorage.getItem(COURIERS_DB_KEY);
          if (couriersStr) {
            setCouriersDB(JSON.parse(couriersStr));
          }
        }

        // Načti aktuální rozdělanou kontrolu z localStorage
        const currentStr = localStorage.getItem(STORAGE_KEY);
        if (currentStr) {
          const parsed = JSON.parse(currentStr);
          setInspection(parsed);
        }
      } catch (e) {
        console.warn("Chyba při načítání dat:", e);
        try {
          const s = localStorage.getItem(SAVED_KEY);
          if (s) setSavedInspections(JSON.parse(s));
          const c = localStorage.getItem(COURIERS_DB_KEY);
          if (c) setCouriersDB(JSON.parse(c));
        } catch (parseError) {
          console.error("Chyba při parsování localStorage:", parseError);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Auto-ukládání aktuální kontroly do localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inspection));
  }, [inspection]);

  // Synchronizuj uložené kontroly do localStorage
  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedInspections));
  }, [savedInspections]);

  // Synchronizuj kartotéku kurýrů do localStorage
  useEffect(() => {
    localStorage.setItem(COURIERS_DB_KEY, JSON.stringify(couriersDB));
  }, [couriersDB]);

  const activeCourier = inspection.couriers.find(c => c.id === activeCourierId) || null;
  const filteredCouriers = useMemo(() => {
    const v = query.trim().toLowerCase();
    if (!v) return inspection.couriers;
    return inspection.couriers.filter(c => [c.name, c.route, c.vehicle].join(" ").toLowerCase().includes(v));
  }, [inspection.couriers, query]);
  const summary = useMemo(() => computeSummary(inspection.couriers), [inspection.couriers]);

  function updateInspection(field, value) { setInspection(cur => ({ ...cur, [field]: value })); }
  function addCourier() { const c = createEmptyCourier(); setInspection(cur => ({ ...cur, couriers: [c, ...cur.couriers] })); setActiveCourierId(c.id); }

  // Přidat kurýry z kartotéky
  function addCouriersFromDB(selectedCourierIds) {
    const newCouriers = selectedCourierIds.map(id => {
      const dbCourier = couriersDB.find(c => c.id === id);
      if (!dbCourier) return null;

      const courier = createEmptyCourier();
      courier.name = dbCourier.name;
      courier.route = dbCourier.primaryRoute || "";
      courier.vehicle = dbCourier.primaryVehicle || "";

      return courier;
    }).filter(Boolean);

    setInspection(cur => ({ ...cur, couriers: [...newCouriers, ...cur.couriers] }));

    if (newCouriers.length > 0) {
      setActiveCourierId(newCouriers[0].id);
    }
  }

  function updateCourier(id, fn) { setInspection(cur => ({ ...cur, couriers: cur.couriers.map(c => c.id === id ? fn(c) : c) })); }
  function deleteCourier(id) { setInspection(cur => ({ ...cur, couriers: cur.couriers.filter(c => c.id !== id) })); if (activeCourierId === id) setActiveCourierId(null); }

  // Uložit aktuální kontrolu
  async function saveInspection() {
    if (inspection.couriers.length === 0) {
      alert("Nejsou žádní kurýři k uložení.");
      return;
    }

    setIsSaving(true);
    try {
      const savedAt = new Date().toISOString();
      const saved = {
        ...inspection,
        id: inspection.id || crypto.randomUUID(),
        savedAt
      };

      console.log("💾 Ukládám kontrolu:", saved.id, "do Supabase...");

      // Ulož do Supabase
      if (inspection.id) {
        // Aktualizace existující
        console.log("📝 Aktualizuji existující kontrolu:", saved.id);
        await updateArchiveEntry(saved);
        setSavedInspections(prev => prev.map(s => s.id === saved.id ? saved : s));
      } else {
        // Nová kontrola
        console.log("✨ Vytvářím novou kontrolu:", saved.id);
        await insertArchiveEntry(saved);
        setSavedInspections(prev => [saved, ...prev]);
      }

      console.log("✅ Kontrola uložena do Supabase!");

      // Resetuj aktuální kontrolu
      setInspection({
        date: todayISO(),
        depot: inspection.depot,
        inspector: inspection.inspector,
        shift: inspection.shift,
        note: "",
        couriers: []
      });
      setActiveCourierId(null);

      alert("✅ Kontrola uložena!");
    } catch (e) {
      console.error("❌ Chyba při ukládání:", e);
      alert("❌ Chyba při ukládání. Zkontroluj konzoli (F12) pro detaily.");
    } finally {
      setIsSaving(false);
    }
  }

  // Začít novou prázdnou kontrolu
  function newInspection() {
    if (inspection.couriers.length > 0) {
      if (!window.confirm("Začít novou kontrolu? Neuložené změny budou ztraceny.")) return;
    }
    setInspection({
      date: todayISO(),
      depot: inspection.depot,
      inspector: inspection.inspector,
      shift: "Ranní kontrola",
      note: "",
      couriers: []
    });
    setActiveCourierId(null);
    setActiveTab("check");
  }

  // Načíst kontrolu z historie pro úpravu
  function loadInspection(saved) {
    if (inspection.couriers.length > 0) {
      if (!window.confirm(`Načíst kontrolu ze dne ${formatDate(saved.date)}? Aktuální neuložené změny budou ztraceny.`)) return;
    }
    setInspection({ ...saved });
    setActiveCourierId(null);
    setActiveTab("check");
  }

  // Smazat kontrolu z historie
  async function deleteInspection(saved) {
    if (!window.confirm(`Opravdu smazat kontrolu ze dne ${formatDate(saved.date)}?`)) return;

    try {
      await deleteArchiveEntry(saved.id);
      setSavedInspections(prev => prev.filter(s => s.id !== saved.id));
      alert("✅ Kontrola smazána");
    } catch (e) {
      console.error("Chyba při mazání:", e);
      alert("❌ Chyba při mazání");
    }
  }

  // === KARTOTÉKA KURÝRŮ ===

  // Přidat kurýra do kartotéky
  async function addCourierToDB(courierData) {
    const newCourier = {
      id: crypto.randomUUID(),
      name: courierData.name || "",
      phone: courierData.phone || "",
      email: courierData.email || "",
      primaryRoute: courierData.primaryRoute || "",
      primaryVehicle: courierData.primaryVehicle || "",
      notes: courierData.notes || "",
      createdAt: new Date().toISOString(),
      ...courierData
    };

    try {
      // Ulož do Supabase
      await insertCourier(newCourier);

      // Aktualizuj lokální stav
      setCouriersDB(prev => [newCourier, ...prev]);
      return newCourier;
    } catch (e) {
      console.error("Chyba při přidávání kurýra:", e);
      alert("❌ Chyba při ukládání kurýra do cloudu");
      return null;
    }
  }

  // Upravit kurýra v kartotéce
  async function updateCourierInDB(id, updates) {
    try {
      console.log("📝 Aktualizuji kurýra:", id, updates);
      
      // Najdi kurýra a uprav ho
      const updatedCourier = couriersDB.find(c => c.id === id);
      if (!updatedCourier) {
        console.error("❌ Kurýr nenalezen:", id);
        return;
      }

      const updated = { ...updatedCourier, ...updates };
      
      console.log("💾 Ukládám do Supabase:", updated);

      // Ulož do Supabase
      await updateCourier(updated);
      
      console.log("✅ Uloženo do Supabase");

      // Aktualizuj lokální stav
      setCouriersDB(prev => {
        const newState = prev.map(c => c.id === id ? updated : c);
        console.log("✅ Lokální stav aktualizován");
        return newState;
      });
      
      alert("✅ Kurýr aktualizován");
    } catch (e) {
      console.error("❌ Chyba při aktualizaci kurýra:", e);
      alert("❌ Chyba při ukládání změn do cloudu: " + e.message);
    }
  }

  // Smazat kurýra z kartotéky
  async function deleteCourierFromDB(id) {
    if (!window.confirm("Opravdu smazat kurýra z kartotéky?")) return;

    try {
      console.log("🗑️ Mažu kurýra:", id);

      // Smaž z Supabase
      await deleteCourier(id);

      // Aktualizuj lokální stav
      setCouriersDB(prev => {
        const updated = prev.filter(c => c.id !== id);
        console.log("✅ Kurýr smazán z lokálního stavu. Zbývá:", updated.length);
        return updated;
      });

      alert("✅ Kurýr smazán");
    } catch (e) {
      console.error("❌ Chyba při mazání kurýra:", e);
      alert("❌ Chyba při mazání kurýra z cloudu");
    }
  }

  // Vyčistit localStorage cache (pro debug)
  function clearLocalStorageCache() {
    if (!window.confirm("Opravdu vyčistit lokální cache? Data se znovu načtou ze Supabase.")) return;

    localStorage.removeItem(COURIERS_DB_KEY);
    localStorage.removeItem(SAVED_KEY);

    alert("✅ Cache vyčištěna. Obnovuji stránku...");
    window.location.reload();
  }

  // Znovu načíst data ze Supabase (bez reloadu stránky)
  async function reloadFromSupabase() {
    if (!window.confirm("Znovu načíst všechna data ze Supabase?")) return;
    
    setIsLoading(true);
    try {
      // Načti kontroly
      const savedData = await fetchArchive();
      if (savedData) {
        setSavedInspections(savedData);
        localStorage.setItem(SAVED_KEY, JSON.stringify(savedData));
      }
      
      // Načti kurýry
      const couriersData = await fetchCouriers();
      if (couriersData) {
        setCouriersDB(couriersData);
        localStorage.setItem(COURIERS_DB_KEY, JSON.stringify(couriersData));
      }
      
      alert("✅ Data znovu načtena ze Supabase!");
    } catch (e) {
      console.error("Chyba při načítání:", e);
      alert("❌ Chyba při načítání dat ze Supabase");
    } finally {
      setIsLoading(false);
    }
  }

  function addQuickNote(courierId, checkId, text) {
    updateCourier(courierId, c => {
      const cur = c.checks?.[checkId]?.note || "";
      return { ...c, checks: { ...c.checks, [checkId]: { ...(c.checks?.[checkId] || { status: "ok" }), note: cur ? `${cur}\n${text}` : text } } };
    });
  }

  // Nahrání fotky k výhradě
  const addPhotoToCheck = (courierId, checkId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Fotka je příliš velká (max 5 MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      updateCourier(courierId, c => {
        const photos = c.checks?.[checkId]?.photos || [];
        return {
          ...c,
          checks: {
            ...c.checks,
            [checkId]: {
              ...(c.checks?.[checkId] || { status: "ok" }),
              photos: [...photos, { id: crypto.randomUUID(), data: e.target.result, name: file.name, date: new Date().toISOString() }]
            }
          }
        };
      });
    };
    reader.readAsDataURL(file);
  };

  // Smazání fotky
  const deletePhoto = (courierId, checkId, photoId) => {
    updateCourier(courierId, c => ({
      ...c,
      checks: {
        ...c.checks,
        [checkId]: {
          ...(c.checks?.[checkId] || {}),
          photos: (c.checks?.[checkId]?.photos || []).filter(p => p.id !== photoId)
        }
      }
    }));
  };

  const isEditingExisting = !!inspection.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white mx-auto animate-pulse">
            <ClipboardCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Načítám data...</h2>
            <p className="text-sm text-slate-500 mt-1">Synchronizace s cloudem</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <style>{`
        @media print {
          .print-hide-on-print { display: none !important; }
          .print-show-only { display: block !important; }
          /* Modal overlay — odstraň backdrop */
          .print-modal-overlay {
            position: static !important;
            background: none !important;
            backdrop-filter: none !important;
            display: block !important;
          }
          /* Modal okno — rozbal na celou stránku */
          .print-modal-window {
            max-height: none !important;
            overflow: visible !important;
            border-radius: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            display: block !important;
          }
          /* Skryj záhlaví modalu (tlačítka, tabs) */
          .print-modal-controls { display: none !important; }
          /* Preview obsah — tiskni normálně */
          .print-modal-scroll {
            overflow: visible !important;
            padding: 0 !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body > * { display: none !important; }
          body > #root .print-modal-overlay,
          body > #root .print-modal-overlay * { display: revert !important; }
          body > #root .print-modal-controls { display: none !important; }
          body > #root .print-hide-on-print { display: none !important; }
        }
        .print-show-only { display: none; }
      `}</style>

      <AnimatePresence>
        {printModal && (
          <motion.div key="pm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PrintModal data={printModal} onClose={() => setPrintModal(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal pro výběr kurýrů z kartotéky */}
      <AnimatePresence mode="wait">
        {showSelectCouriersModal && (
          <SelectCouriersModal
            couriersDB={couriersDB}
            savedInspections={savedInspections}
            onSelect={(ids) => {
              addCouriersFromDB(ids);
              setShowSelectCouriersModal(false);
            }}
            onClose={() => setShowSelectCouriersModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal pro přidání/editaci kurýra */}
      <AnimatePresence mode="wait">
        {showCourierModal && (
          <CourierEditModal
            key={editingCourierData?.id || "new-courier"}
            courier={editingCourierData}
            onSave={(data) => {
              if (editingCourierData) {
                updateCourierInDB(editingCourierData.id, data);
              } else {
                addCourierToDB(data);
              }
              setShowCourierModal(false);
              setEditingCourierData(null);
            }}
            onClose={() => {
              setShowCourierModal(false);
              setEditingCourierData(null);
            }}
          />
        )}
      </AnimatePresence>

      <header className="print-hide-on-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight leading-tight">Kontrola kurýrů</h1>
              <p className="text-xs text-slate-400 leading-tight">Jednoduchá evidence kontrol a statistiky</p>
            </div>
            <h1 className="sm:hidden text-base font-bold tracking-tight">Kurýři</h1>
          </div>

          {/* Tab přepínač */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 overflow-x-auto">
            <button onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${activeTab === "dashboard" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}>
              <BarChart2 className="h-4 w-4" />
              <span className="hidden xs:inline">Přehled</span>
            </button>
            <button onClick={() => setActiveTab("check")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${activeTab === "check" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}>
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden xs:inline">Kontrola</span>
            </button>
            <button onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${activeTab === "history" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}>
              <Archive className="h-4 w-4" />
              <span className="hidden xs:inline">Historie</span>
              {savedInspections.length > 0 && <span className="rounded-full bg-slate-950 text-white text-xs px-1.5 py-0.5">{savedInspections.length}</span>}
            </button>
            <button onClick={() => setActiveTab("couriers")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${activeTab === "couriers" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}>
              <User className="h-4 w-4" />
              <span className="hidden xs:inline">Kurýři</span>
            </button>
            <button onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${activeTab === "leaderboard" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}>
              <Award className="h-4 w-4" />
              <span className="hidden xs:inline">Žebříček</span>
            </button>
            <button onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${activeTab === "stats" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}>
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Statistiky</span>
            </button>
          </div>

          {/* Místo pro budoucí funkce */}
          <div className="flex gap-1">
            <button
              onClick={reloadFromSupabase}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition"
              title="Znovu načíst data ze Supabase"
            >
              ⬇️
            </button>
            <button
              onClick={clearLocalStorageCache}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition"
              title="Vyčistit lokální cache a reload"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Akční tlačítka */}
        {activeTab === "check" && (
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 sm:px-6 flex-wrap">
            <Button onClick={addCourier} size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Přidat kurýra
            </Button>
            {couriersDB.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowSelectCouriersModal(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Přidat z kartotéky
              </Button>
            )}
            <Button variant="success" size="sm" onClick={saveInspection} disabled={isSaving || inspection.couriers.length === 0}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? "Ukládám..." : isEditingExisting ? "Uložit změny" : "Uložit kontrolu"}
            </Button>
            <Button variant="outline" size="sm" onClick={newInspection}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Nová kontrola
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPrintModal({ type: "inspection", inspection, archive: savedInspections })}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Report kontroly</span>
              <span className="sm:hidden">Report</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPrintModal({ type: "uniform", inspection, archive: null })}>
              <Shirt className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Objednávka uniforem</span>
              <span className="sm:hidden">Uniformy</span>
            </Button>
          </div>
        )}
        {activeTab === "stats" && savedInspections.length > 0 && (
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 sm:px-6 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setPrintModal({ type: "stats", inspection: null, archive: savedInspections })}>
              <Printer className="h-3.5 w-3.5 mr-1.5" /> PDF statistik
            </Button>
          </div>
        )}
      </header>

      {activeTab === "history" ? (
        <main className="print-hide-on-print mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <HistoryView
            savedInspections={savedInspections}
            onLoadInspection={loadInspection}
            onDeleteInspection={deleteInspection}
            onPrintInspection={(insp) => setPrintModal({ type: "inspection", inspection: insp, archive: savedInspections })}
            onPrintUniform={(insp) => setPrintModal({ type: "uniform", inspection: insp, archive: null })}
          />
        </main>
      ) : activeTab === "stats" ? (
        <main className="print-hide-on-print mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <StatsView archive={savedInspections} />
        </main>
      ) : activeTab === "dashboard" ? (
        <main className="print-hide-on-print mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <DashboardView
            savedInspections={savedInspections}
            currentInspection={inspection}
            onGoToCheck={() => setActiveTab("check")}
            onGoToHistory={() => setActiveTab("history")}
          />
        </main>
      ) : activeTab === "couriers" ? (
        <main className="print-hide-on-print mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <CouriersView
            savedInspections={savedInspections}
            couriersDB={couriersDB}
            onAddCourier={addCourierToDB}
            onUpdateCourier={updateCourierInDB}
            onDeleteCourier={deleteCourierFromDB}
            onShowAddModal={() => { setShowCourierModal(true); setEditingCourierData(null); }}
            onShowEditModal={(courier) => { setShowCourierModal(true); setEditingCourierData(courier); }}
          />
        </main>
      ) : activeTab === "leaderboard" ? (
        <main className="print-hide-on-print mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <LeaderboardView savedInspections={savedInspections} couriersDB={couriersDB} />
        </main>
      ) : (
        <main className="print-hide-on-print mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_1fr]">
          <aside className="space-y-5">
            {isEditingExisting && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                ✏️ Upravuješ uloženou kontrolu ze dne <strong>{formatDate(inspection.date)}</strong>. Po úpravách klikni „Uložit změny".
              </div>
            )}
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-sm font-medium text-slate-700">Datum
                    <input type="date" value={inspection.date} onChange={e => updateInspection("date", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400" />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">Směna
                    <input value={inspection.shift} onChange={e => updateInspection("shift", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400" />
                  </label>
                </div>
                <label className="space-y-1 text-sm font-medium text-slate-700">Depo / hala
                  <input value={inspection.depot} onChange={e => updateInspection("depot", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400" />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">Kontrolující osoba
                  <input value={inspection.inspector} onChange={e => updateInspection("inspector", e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400" />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">Poznámka ke kontrole
                  <textarea value={inspection.note} onChange={e => updateInspection("note", e.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400" placeholder="Např. namátková ranní kontrola..." />
                </label>
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Celkem" value={summary.total} />
              <StatCard label="Nevyhověl" value={summary.fail} />
            </div>
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Hledat kurýra, trasu, SPZ..." className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:border-slate-400" />
                </div>
                <div className="max-h-[48vh] space-y-2 overflow-auto pr-1">
                  {filteredCouriers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">Zatím tu není žádný kurýr.</div>
                  ) : filteredCouriers.map(courier => {
                    const result = getCourierResult(courier);
                    const issueCount = CHECKS.filter(ch => courier.checks?.[ch.id]?.status !== "ok").length;
                    return (
                      <button key={courier.id} onClick={() => setActiveCourierId(courier.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition hover:bg-white ${activeCourierId === courier.id ? "border-slate-950 bg-white shadow-sm" : "border-slate-200 bg-slate-50"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{courier.name || "Bez jména"}</div>
                            <div className="text-sm text-slate-500">{courier.route || "Bez trasy"} · {courier.vehicle || "Bez vozidla"}</div>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${resultClasses(result.tone)}`}>{result.label}</span>
                        </div>
                        {issueCount > 0 && <div className="mt-2 text-xs text-slate-500">Výhrady: {issueCount}</div>}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </aside>
          <section className="space-y-5">
            {activeCourier
              ? <CourierEditor courier={activeCourier} updateCourier={updateCourier} deleteCourier={deleteCourier} addQuickNote={addQuickNote} />
              : <EmptyState onAdd={addCourier} />}
          </section>
        </main>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onAdd }) {
  return (
    <Card className="rounded-3xl border-dashed border-slate-300 bg-white shadow-sm">
      <CardContent className="flex min-h-[65vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100"><ClipboardCheck className="h-8 w-8 text-slate-600" /></div>
        <div>
          <h2 className="text-2xl font-bold">Začni kontrolu přidáním prvního kurýra</h2>
          <p className="mt-2 max-w-md text-slate-500">U každého kurýra odklikáš servisní kříže, vratky do klecí, čistotu vozidla, uniformu a stav vozidla.</p>
        </div>
        <Button onClick={onAdd} className="rounded-2xl px-6 py-6 text-base"><Plus className="mr-2 h-5 w-5" /> Přidat kurýra</Button>
      </CardContent>
    </Card>
  );
}

function CourierEditor({ courier, updateCourier, deleteCourier, addQuickNote }) {
  const result = getCourierResult(courier);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-2xl font-bold">Karta kurýra</h2><p className="text-slate-500">Vyplň základní údaje a odklikej kontrolní body.</p></div>
            <div className={`rounded-full border px-3 py-1.5 text-sm font-bold ${resultClasses(result.tone)}`}>{result.label}</div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">Jméno kurýra
              <input value={courier.name} onChange={e => updateCourier(courier.id, c => ({ ...c, name: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400" placeholder="Jan Novák" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Trasa
              <input value={courier.route} onChange={e => updateCourier(courier.id, c => ({ ...c, route: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400" placeholder="12A" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">SPZ / číslo vozidla
              <input value={courier.vehicle} onChange={e => updateCourier(courier.id, c => ({ ...c, vehicle: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400" placeholder="1AB 2345" />
            </label>
          </div>
        </CardContent>
      </Card>

      {CHECKS.map(check => {
        const value = courier.checks?.[check.id]?.status || "ok";
        const note = courier.checks?.[check.id]?.note || "";
        return (
          <Card key={check.id} className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div><h3 className="text-lg font-bold">{check.title}</h3><p className="text-sm text-slate-500">{check.description}</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {STATUS_OPTIONS.map(option => {
                  const Icon = option.icon; const selected = value === option.value;
                  return (
                    <button key={option.value} onClick={() => updateCourier(courier.id, c => ({ ...c, checks: { ...c.checks, [check.id]: { ...(c.checks?.[check.id] || {}), status: option.value } } }))}
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 font-semibold transition active:scale-95 min-h-[56px] ${selected ? statusClasses(option.value) : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white active:bg-slate-100"}`}>
                      <Icon className="h-6 w-6" /> {option.label}
                    </button>
                  );
                })}
              </div>
              {check.id === "uniform" && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-700">🧥 Evidence uniformy</p>
                    <button onClick={() => updateCourier(courier.id, c => ({ ...c, uniformDetails: { ...c.uniformDetails, needsReorder: !c.uniformDetails?.needsReorder } }))}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${courier.uniformDetails?.needsReorder ? "border-blue-400 bg-blue-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>
                      {courier.uniformDetails?.needsReorder ? "✓ Potřebuje doplnit zásobu" : "+ Potřebuje doplnit zásobu"}
                    </button>
                  </div>
                  {courier.uniformDetails?.needsReorder && value === "ok" && (
                    <p className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">ℹ️ <strong>Nezapočítává se do chyb</strong> — kurýr uniformu má, jen potřebuje doplnit zásobu.</p>
                  )}
                  {value !== "ok" && (
                    <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">⚠️ <strong>Započítává se do chyb</strong> — kurýr uniformu nemá nebo je nevyhovující.</p>
                  )}
                  {(value !== "ok" || courier.uniformDetails?.needsReorder) && (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap gap-2">
                        {UNIFORM_ITEMS.map(item => {
                          const checked = courier.uniformDetails?.missing?.includes(item);
                          return (
                            <button key={item} onClick={() => updateCourier(courier.id, c => { const cur = c.uniformDetails?.missing || []; return { ...c, uniformDetails: { ...c.uniformDetails, missing: checked ? cur.filter(i => i !== item) : [...cur, item] } }; })}
                              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${checked ? (value !== "ok" ? "border-rose-500 bg-rose-500 text-white" : "border-blue-500 bg-blue-500 text-white") : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>
                              {checked ? "✓ " : ""}{item}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">Velikost (oblečení):
                          <select value={courier.uniformDetails?.size || ""} onChange={e => updateCourier(courier.id, c => ({ ...c, uniformDetails: { ...c.uniformDetails, size: e.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base outline-none focus:border-slate-400">
                            <option value="">— vyberte —</option>
                            {UNIFORM_SIZES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </label>
                        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">Vel. kalhot:
                          <select value={courier.uniformDetails?.pantsSize || ""} onChange={e => updateCourier(courier.id, c => ({ ...c, uniformDetails: { ...c.uniformDetails, pantsSize: e.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base outline-none focus:border-slate-400">
                            <option value="">— vyberte —</option>
                            {UNIFORM_PANTS_SIZES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {value !== "ok" && (
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    {check.quickNotes.map(qn => (
                      <button key={qn} onClick={() => addQuickNote(courier.id, check.id, qn)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 active:scale-95 transition">+ {qn}</button>
                    ))}
                  </div>
                  <textarea value={note} onChange={e => updateCourier(courier.id, c => ({ ...c, checks: { ...c.checks, [check.id]: { ...(c.checks?.[check.id] || {}), note: e.target.value } } }))}
                    rows={3} placeholder="Doplň poznámku k nedostatku..." className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400" />

                  {/* Fotky */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">📷 Fotky k výhradě</label>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) addPhotoToCheck(courier.id, check.id, file);
                            e.target.value = "";
                          }}
                        />
                        <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 transition active:scale-95">
                          <Camera className="h-4 w-4" /> Přidat fotku
                        </span>
                      </label>
                    </div>
                    {(courier.checks?.[check.id]?.photos?.length > 0) && (
                      <div className="grid grid-cols-3 gap-2">
                        {courier.checks[check.id].photos.map(photo => (
                          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <img
                              src={photo.data}
                              alt={photo.name}
                              className="h-full w-full object-cover"
                            />
                            <button
                              onClick={() => deletePhoto(courier.id, check.id, photo.id)}
                              className="absolute top-1 right-1 rounded-full bg-rose-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition active:scale-95"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                const a = document.createElement("a");
                                a.href = photo.data;
                                a.download = photo.name;
                                a.click();
                              }}
                              className="absolute bottom-1 right-1 rounded-full bg-slate-950 p-1.5 text-white opacity-0 group-hover:opacity-100 transition active:scale-95"
                            >
                              <ImageIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">Opatření
              <select value={courier.action} onChange={e => updateCourier(courier.id, c => ({ ...c, action: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400">
                {ACTION_OPTIONS.map(a => <option key={a}>{a}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">Obecná poznámka ke kurýrovi
              <textarea value={courier.generalNote} onChange={e => updateCourier(courier.id, c => ({ ...c, generalNote: e.target.value }))} rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400" placeholder="Např. domluvena opakovaná kontrola..." />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="destructive" onClick={() => deleteCourier(courier.id)}><Trash2 className="mr-2 h-4 w-4" /> Smazat kurýra</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── STATS VIEW ───────────────────────────────────────────────────────────────
function StatsView({ archive }) {
  const [rangeWeeks, setRangeWeeks] = useState(8);

  const stats = useMemo(() => {
    if (archive.length === 0) return null;
    const allEntries = archive.flatMap(insp => insp.couriers.map(c => ({ ...c, inspectionDate: insp.date })));
    const courierMap = {}, routeMap = {};
    allEntries.forEach(c => {
      const k = c.name?.trim() || "Neznámý";
      if (!courierMap[k]) courierMap[k] = { name: k, total: 0, issues: 0 };
      courierMap[k].total += 1;
      const r = getCourierResult(c);
      if (r.tone !== "ok") courierMap[k].issues += 1;
      const rk = c.route?.trim() || "Bez trasy";
      if (!routeMap[rk]) routeMap[rk] = { route: rk, total: 0, issues: 0 };
      routeMap[rk].total += 1;
      if (r.tone !== "ok") routeMap[rk].issues += 1;
    });
    const checkCounts = CHECKS.map(ch => ({ name: ch.short, pocet: allEntries.filter(c => (c.checks?.[ch.id]?.status || "ok") !== "ok").length }));
    const now = new Date();
    const weeks = Array.from({ length: rangeWeeks }, (_, i) => {
      const start = new Date(now); start.setDate(now.getDate() - (rangeWeeks - 1 - i) * 7); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const label = `${start.getDate()}.${start.getMonth() + 1}.`;
      const inWeek = archive.filter(insp => { const d = new Date(insp.date); return d >= start && d <= end; });
      return { label, checked: inWeek.reduce((s, i) => s + i.couriers.length, 0), issues: inWeek.reduce((s, i) => s + i.couriers.filter(c => getCourierResult(c).tone !== "ok").length, 0) };
    });

    // Porovnání období
    const now30 = new Date(now);
    now30.setDate(now30.getDate() - 30);
    const now60 = new Date(now);
    now60.setDate(now60.getDate() - 60);

    const currentPeriod = archive.filter(insp => new Date(insp.date) >= now30);
    const previousPeriod = archive.filter(insp => {
      const d = new Date(insp.date);
      return d >= now60 && d < now30;
    });

    const currentCouriers = currentPeriod.flatMap(i => i.couriers);
    const previousCouriers = previousPeriod.flatMap(i => i.couriers);

    const currentIssues = currentCouriers.filter(c => getCourierResult(c).tone !== "ok").length;
    const previousIssues = previousCouriers.filter(c => getCourierResult(c).tone !== "ok").length;

    const currentIssueRate = currentCouriers.length > 0 ? Math.round((currentIssues / currentCouriers.length) * 100) : 0;
    const previousIssueRate = previousCouriers.length > 0 ? Math.round((previousIssues / previousCouriers.length) * 100) : 0;

    const comparison = {
      current: {
        inspections: currentPeriod.length,
        couriers: currentCouriers.length,
        issues: currentIssues,
        issueRate: currentIssueRate
      },
      previous: {
        inspections: previousPeriod.length,
        couriers: previousCouriers.length,
        issues: previousIssues,
        issueRate: previousIssueRate
      },
      diff: {
        inspections: currentPeriod.length - previousPeriod.length,
        couriers: currentCouriers.length - previousCouriers.length,
        issues: currentIssues - previousIssues,
        issueRate: currentIssueRate - previousIssueRate
      }
    };

    return {
      topCouriers: Object.values(courierMap).map(c => ({ ...c, issueRate: Math.round(c.issues / c.total * 100) })).sort((a, b) => b.issues - a.issues).slice(0, 10),
      topRoutes: Object.values(routeMap).map(r => ({ ...r, issueRate: Math.round(r.issues / r.total * 100) })).sort((a, b) => b.issues - a.issues).slice(0, 10),
      checkCounts, weeks, total: archive.length, totalCouriers: allEntries.length,
      comparison
    };
  }, [archive, rangeWeeks]);

  if (archive.length === 0) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100"><BarChart2 className="h-8 w-8 text-slate-400" /></div>
      <div><h2 className="text-2xl font-bold">Zatím žádná archivovaná data</h2><p className="mt-2 max-w-md text-slate-500">Po každé kontrole klikni na <strong>"Archivovat a nová"</strong>.</p></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-bold">Statistiky a trendy</h2><p className="text-slate-500">Z {stats.total} kontrol · {stats.totalCouriers} kurýrů celkem</p></div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">Trend:
          <select value={rangeWeeks} onChange={e => setRangeWeeks(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none">
            <option value={4}>4 týdny</option><option value={8}>8 týdnů</option><option value={12}>12 týdnů</option><option value={26}>26 týdnů</option>
          </select>
        </label>
      </div>

      {/* Porovnání období */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">📊 Porovnání období (poslední 30 dní vs. předchozích 30 dní)</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500 mb-1">Kontrol</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.comparison.current.inspections}</span>
              {stats.comparison.diff.inspections !== 0 && (
                <span className={`text-sm font-semibold ${
                  stats.comparison.diff.inspections > 0 ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {stats.comparison.diff.inspections > 0 ? "+" : ""}{stats.comparison.diff.inspections}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Předchozí: {stats.comparison.previous.inspections}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500 mb-1">Kurýrů</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.comparison.current.couriers}</span>
              {stats.comparison.diff.couriers !== 0 && (
                <span className={`text-sm font-semibold ${
                  stats.comparison.diff.couriers > 0 ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {stats.comparison.diff.couriers > 0 ? "+" : ""}{stats.comparison.diff.couriers}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Předchozí: {stats.comparison.previous.couriers}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500 mb-1">Výhrad celkem</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600">{stats.comparison.current.issues}</span>
              {stats.comparison.diff.issues !== 0 && (
                <span className={`text-sm font-semibold ${
                  stats.comparison.diff.issues < 0 ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {stats.comparison.diff.issues > 0 ? "+" : ""}{stats.comparison.diff.issues}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Předchozí: {stats.comparison.previous.issues}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500 mb-1">% výhrad</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${
                stats.comparison.current.issueRate === 0 ? "text-emerald-600" :
                stats.comparison.current.issueRate < 20 ? "text-blue-600" :
                stats.comparison.current.issueRate < 40 ? "text-amber-600" :
                "text-rose-600"
              }`}>
                {stats.comparison.current.issueRate}%
              </span>
              {stats.comparison.diff.issueRate !== 0 && (
                <span className={`text-sm font-semibold flex items-center gap-0.5 ${
                  stats.comparison.diff.issueRate < 0 ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {stats.comparison.diff.issueRate < 0 ? (
                    <>↓ {Math.abs(stats.comparison.diff.issueRate)}pp</>
                  ) : (
                    <>↑ +{stats.comparison.diff.issueRate}pp</>
                  )}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Předchozí: {stats.comparison.previous.issueRate}%
            </div>
          </div>
        </div>

        {/* Trend message */}
        {stats.comparison.diff.issueRate < -5 && (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
            <strong>✅ Skvělý trend!</strong> Počet výhrad klesl o {Math.abs(stats.comparison.diff.issueRate)} procentních bodů.
          </div>
        )}
        {stats.comparison.diff.issueRate > 5 && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
            <strong>⚠️ Pozor!</strong> Počet výhrad stoupl o {stats.comparison.diff.issueRate} procentních bodů.
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">Trend — výhrady v čase</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.weeks}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Legend />
            <Line type="monotone" dataKey="checked" name="Kontrolováno" stroke="#94a3b8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="issues" name="Výhrady" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">Nejčastější typy chyb</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.checkCounts} layout="vertical" margin={{ top: 4, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} /><XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} /><YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} /><Tooltip />
            <Bar dataKey="pocet" name="Počet" fill="#f59e0b" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">Kurýři s nejvíce výhradami</h3>
          <div className="space-y-2">
            {stats.topCouriers.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-slate-400">{i + 1}.</span>
                <span className="w-32 truncate text-sm font-semibold">{c.name}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-2.5 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${stats.topCouriers[0].issues > 0 ? (c.issues / stats.topCouriers[0].issues) * 100 : 0}%` }} />
                </div>
                <span className="w-20 text-right text-xs text-slate-500">{c.issues}× ({c.issueRate}%)</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">Trasy s nejvíce výhradami</h3>
          <div className="space-y-2">
            {stats.topRoutes.map((r, i) => (
              <div key={r.route} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-slate-400">{i + 1}.</span>
                <span className="w-20 truncate text-sm font-semibold">{r.route}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-2.5 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${stats.topRoutes[0].issues > 0 ? (r.issues / stats.topRoutes[0].issues) * 100 : 0}%` }} />
                </div>
                <span className="w-20 text-right text-xs text-slate-500">{r.issues}× ({r.issueRate}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
function DashboardView({ savedInspections, currentInspection, onGoToCheck, onGoToHistory }) {
  const todayStats = useMemo(() => {
    const today = todayISO();
    const todayInspections = savedInspections.filter(insp => insp.date === today);
    const couriers = todayInspections.flatMap(insp => insp.couriers);
    const issues = couriers.filter(c => getCourierResult(c).tone !== "ok").length;

    return {
      inspections: todayInspections.length,
      couriers: couriers.length,
      ok: couriers.length - issues,
      issues
    };
  }, [savedInspections]);

  const weekStats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekInspections = savedInspections.filter(insp => new Date(insp.date) >= weekAgo);
    const couriers = weekInspections.flatMap(insp => insp.couriers);
    const issues = couriers.filter(c => getCourierResult(c).tone !== "ok").length;

    return {
      inspections: weekInspections.length,
      couriers: couriers.length,
      ok: couriers.length - issues,
      issues
    };
  }, [savedInspections]);

  // Top kurýři s výhradami (poslední týden)
  const topCouriers = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekInspections = savedInspections.filter(insp => new Date(insp.date) >= weekAgo);
    const courierMap = {};

    weekInspections.forEach(insp => {
      insp.couriers.forEach(c => {
        const name = c.name?.trim() || "Bez jména";
        if (!courierMap[name]) courierMap[name] = { name, issues: 0, total: 0 };
        courierMap[name].total += 1;
        if (getCourierResult(c).tone !== "ok") courierMap[name].issues += 1;
      });
    });

    return Object.values(courierMap)
      .sort((a, b) => b.issues - a.issues)
      .slice(0, 5);
  }, [savedInspections]);

  const hasCurrentWork = currentInspection.couriers.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">📊 Rychlý přehled</h2>
        <p className="text-slate-500">Dnešní a týdenní statistiky</p>
      </div>

      {/* Rozdělaná kontrola */}
      {hasCurrentWork && (
        <div className="rounded-3xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-blue-900">🚧 Máš rozdělanou kontrolu</h3>
              <p className="mt-1 text-sm text-blue-700">
                {currentInspection.couriers.length} {currentInspection.couriers.length === 1 ? "kurýr" : currentInspection.couriers.length < 5 ? "kurýři" : "kurýrů"} · {formatDate(currentInspection.date)}
              </p>
            </div>
            <Button onClick={onGoToCheck} className="shrink-0">
              Dokončit kontrolu
            </Button>
          </div>
        </div>
      )}

      {/* Dnešní statistiky */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold">{todayStats.inspections}</div>
          <div className="mt-1 text-sm font-medium text-slate-600">Dnešní kontroly</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold">{todayStats.couriers}</div>
          <div className="mt-1 text-sm font-medium text-slate-600">Dnešních kurýrů</div>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="text-3xl font-bold text-emerald-700">{todayStats.ok}</div>
          <div className="mt-1 text-sm font-medium text-emerald-600">✓ Bez výhrad dnes</div>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="text-3xl font-bold text-amber-700">{todayStats.issues}</div>
          <div className="mt-1 text-sm font-medium text-amber-600">⚠ Výhrad dnes</div>
        </div>
      </div>

      {/* Týdenní statistiky */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">Poslední týden</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <div className="text-2xl font-bold">{weekStats.inspections}</div>
            <div className="text-sm text-slate-600">Kontrol</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{weekStats.couriers}</div>
            <div className="text-sm text-slate-600">Kurýrů</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{weekStats.ok}</div>
            <div className="text-sm text-slate-600">Bez výhrad</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{weekStats.issues}</div>
            <div className="text-sm text-slate-600">S výhradami</div>
          </div>
        </div>
      </div>

      {/* Top kurýři s výhradami */}
      {topCouriers.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">⚠️ Poslední týden - kurýři s výhradami</h3>
          <div className="space-y-2">
            {topCouriers.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.issues} {c.issues === 1 ? "výhrada" : c.issues < 5 ? "výhrady" : "výhrad"} z {c.total} kontrol
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-600">{c.issues}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rychlé akce */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={onGoToCheck}
          className="flex items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white p-6 text-left hover:border-slate-950 hover:shadow-lg transition"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold text-lg">Nová kontrola</div>
            <div className="text-sm text-slate-500">Začít kontrolu kurýrů</div>
          </div>
        </button>

        <button
          onClick={onGoToHistory}
          className="flex items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white p-6 text-left hover:border-slate-950 hover:shadow-lg transition"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold text-lg">Historie</div>
            <div className="text-sm text-slate-500">{savedInspections.length} uložených kontrol</div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView({ savedInspections, onLoadInspection, onDeleteInspection, onPrintInspection, onPrintUniform }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, issues, ok
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month

  // Filtrování a vyhledávání
  const filteredInspections = useMemo(() => {
    return savedInspections.filter(insp => {
      // Filtr podle typu
      if (filterType !== "all") {
        const hasIssues = insp.couriers.some(c => getCourierResult(c).tone !== "ok");
        if (filterType === "issues" && !hasIssues) return false;
        if (filterType === "ok" && hasIssues) return false;
      }

      // Filtr podle data
      if (dateRange !== "all") {
        const inspDate = new Date(insp.date);
        const now = new Date();
        const daysDiff = Math.floor((now - inspDate) / (1000 * 60 * 60 * 24));

        if (dateRange === "today" && daysDiff !== 0) return false;
        if (dateRange === "week" && daysDiff > 7) return false;
        if (dateRange === "month" && daysDiff > 30) return false;
      }

      // Vyhledávání
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchableText = [
          insp.date,
          insp.depot,
          insp.inspector,
          insp.shift,
          ...insp.couriers.map(c => [c.name, c.route, c.vehicle].join(" "))
        ].join(" ").toLowerCase();

        if (!searchableText.includes(q)) return false;
      }

      return true;
    });
  }, [savedInspections, searchQuery, filterType, dateRange]);

  if (savedInspections.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
          <Archive className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Zatím žádné uložené kontroly</h2>
          <p className="mt-2 max-w-md text-slate-500">
            Po každé kontrole klikni na <strong>"Uložit kontrolu"</strong> a najdeš ji tady.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Historie kontrol</h2>
            <p className="text-slate-500">
              Zobrazeno {filteredInspections.length} z {savedInspections.length} kontrol
            </p>
          </div>
        </div>

        {/* Vyhledávání a filtry */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Vyhledávání */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Hledat kurýra, trasu, depo..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* Filtr podle výsledku */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">Všechny kontroly</option>
              <option value="issues">Jen s výhradami</option>
              <option value="ok">Jen bez výhrad</option>
            </select>

            {/* Filtr podle data */}
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">Celá historie</option>
              <option value="today">Dnes</option>
              <option value="week">Poslední týden</option>
              <option value="month">Poslední měsíc</option>
            </select>
          </div>

          {/* Aktivní filtry */}
          {(searchQuery || filterType !== "all" || dateRange !== "all") && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-500">Filtrováno:</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  "{searchQuery}" <X className="h-3 w-3" />
                </button>
              )}
              {filterType !== "all" && (
                <button
                  onClick={() => setFilterType("all")}
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  {filterType === "issues" ? "S výhradami" : "Bez výhrad"} <X className="h-3 w-3" />
                </button>
              )}
              {dateRange !== "all" && (
                <button
                  onClick={() => setDateRange("all")}
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  {dateRange === "today" ? "Dnes" : dateRange === "week" ? "Týden" : "Měsíc"} <X className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => { setSearchQuery(""); setFilterType("all"); setDateRange("all"); }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 underline"
              >
                Vymazat vše
              </button>
            </div>
          )}
        </div>

        {filteredInspections.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-slate-500">Žádné kontroly nevyhovují filtrům.</p>
            <button
              onClick={() => { setSearchQuery(""); setFilterType("all"); setDateRange("all"); }}
              className="mt-2 text-sm font-medium text-slate-600 hover:text-slate-900 underline"
            >
              Vymazat filtry
            </button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Datum</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Depo</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Kontrolující</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Směna</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">Kurýrů</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">Nevyhovělo</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">% OK</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">Akce</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredInspections].reverse().map((insp, i) => {
                const ok = insp.couriers.filter(c => getCourierResult(c).tone === "ok").length;
                const fail = insp.couriers.length - ok;
                const pct = insp.couriers.length > 0 ? Math.round(ok / insp.couriers.length * 100) : 100;
                return (
                  <tr key={insp.id || insp.savedAt} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="border-b border-slate-100 px-3 py-2 font-medium">{formatDate(insp.date)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.depot}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.inspector}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.shift}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center font-bold">{insp.couriers.length}</td>
                    <td className={`border-b border-slate-100 px-3 py-2 text-center font-bold ${fail > 0 ? "text-amber-600" : "text-slate-400"}`}>
                      {fail}
                    </td>
                    <td className={`border-b border-slate-100 px-3 py-2 text-center font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                      {pct}%
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <Button size="sm" variant="outline" onClick={() => onLoadInspection(insp)}>
                          <PencilLine className="h-3.5 w-3.5 mr-1" /> Upravit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onPrintInspection(insp)}>
                          <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                        </Button>
                        <Button size="sm" variant="blue" onClick={() => onPrintUniform(insp)}>
                          <Shirt className="h-3.5 w-3.5 mr-1" /> Uniformy
                        </Button>
                        <button
                          onClick={() => onDeleteInspection(insp)}
                          className="rounded-xl p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── LEADERBOARD VIEW ─────────────────────────────────────────────────────────
function LeaderboardView({ savedInspections, couriersDB }) {
  const [periodWeeks, setPeriodWeeks] = useState(4);

  // Vypočítej žebříček kurýrů
  const leaderboard = useMemo(() => {
    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - periodWeeks * 7);

    const periodInspections = savedInspections.filter(insp => new Date(insp.date) >= weeksAgo);

    const courierMap = {};

    periodInspections.forEach(insp => {
      insp.couriers.forEach(c => {
        const name = c.name?.trim() || "Bez jména";
        if (!courierMap[name]) {
          courierMap[name] = {
            name,
            totalInspections: 0,
            passedInspections: 0,
            failedInspections: 0,
            totalIssues: 0,
            issueRate: 0,
            dbCourier: couriersDB.find(dbc => dbc.name.trim() === name)
          };
        }

        courierMap[name].totalInspections += 1;

        const result = getCourierResult(c);
        if (result.tone === "ok") {
          courierMap[name].passedInspections += 1;
        } else {
          courierMap[name].failedInspections += 1;

          // Spočítej konkrétní výhrady
          CHECKS.forEach(check => {
            if (c.checks?.[check.id]?.status !== "ok") {
              courierMap[name].totalIssues += 1;
            }
          });
        }
      });
    });

    // Vypočítej míru výhrad
    Object.values(courierMap).forEach(courier => {
      courier.issueRate = courier.totalInspections > 0
        ? Math.round((courier.failedInspections / courier.totalInspections) * 100)
        : 0;
    });

    return Object.values(courierMap);
  }, [savedInspections, couriersDB, periodWeeks]);

  // Top 10 nejlepších (nejméně výhrad)
  const topCouriers = useMemo(() => {
    return [...leaderboard]
      .filter(c => c.totalInspections >= 3) // Minimálně 3 kontroly
      .sort((a, b) => a.issueRate - b.issueRate || b.totalInspections - a.totalInspections)
      .slice(0, 10);
  }, [leaderboard]);

  // Top 10 nejhorších (nejvíc výhrad)
  const bottomCouriers = useMemo(() => {
    return [...leaderboard]
      .filter(c => c.totalInspections >= 3) // Minimálně 3 kontroly
      .sort((a, b) => b.issueRate - a.issueRate || a.totalInspections - b.totalInspections)
      .slice(0, 10);
  }, [leaderboard]);

  if (leaderboard.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
          <Award className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Zatím žádné statistiky</h2>
          <p className="mt-2 max-w-md text-slate-500">
            Žebříček se vytvoří po uložení kontrol.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">🏆 Žebříček kurýrů</h2>
          <p className="text-slate-500">
            Hodnocení {leaderboard.length} kurýrů za vybrané období
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          Období:
          <select
            value={periodWeeks}
            onChange={e => setPeriodWeeks(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none"
          >
            <option value={1}>Poslední týden</option>
            <option value={4}>Poslední měsíc</option>
            <option value={12}>Poslední 3 měsíce</option>
            <option value={26}>Poslední 6 měsíců</option>
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 10 nejlepších */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-emerald-900 flex items-center gap-2">
            <Award className="h-5 w-5" />
            🥇 Top 10 - Nejlepší kurýři
          </h3>
          <div className="space-y-2">
            {topCouriers.length === 0 ? (
              <p className="text-sm text-emerald-700">Nedostatek dat (minimálně 3 kontroly)</p>
            ) : (
              topCouriers.map((courier, i) => (
                <div
                  key={courier.name}
                  className={`flex items-center gap-3 rounded-xl p-3 ${
                    i === 0 ? "bg-amber-100 border-2 border-amber-300" :
                    i === 1 ? "bg-slate-200 border border-slate-300" :
                    i === 2 ? "bg-orange-100 border border-orange-200" :
                    "bg-white border border-emerald-100"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    i === 0 ? "bg-amber-500 text-white" :
                    i === 1 ? "bg-slate-400 text-white" :
                    i === 2 ? "bg-orange-400 text-white" :
                    "bg-emerald-500 text-white"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{courier.name}</div>
                    <div className="text-xs text-slate-600">
                      {courier.totalInspections} {courier.totalInspections === 1 ? "kontrola" : "kontrol"} · {courier.passedInspections}× OK
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      courier.issueRate === 0 ? "text-emerald-600" : "text-slate-600"
                    }`}>
                      {courier.issueRate}%
                    </div>
                    <div className="text-xs text-slate-500">výhrad</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top 10 nejhorších */}
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-rose-900 flex items-center gap-2">
            <Award className="h-5 w-5" />
            ⚠️ Top 10 - Potřebují zlepšení
          </h3>
          <div className="space-y-2">
            {bottomCouriers.length === 0 ? (
              <p className="text-sm text-rose-700">Nedostatek dat (minimálně 3 kontroly)</p>
            ) : (
              bottomCouriers.map((courier, i) => (
                <div
                  key={courier.name}
                  className="flex items-center gap-3 rounded-xl border border-rose-100 bg-white p-3"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    courier.issueRate >= 80 ? "bg-rose-600 text-white" :
                    courier.issueRate >= 50 ? "bg-amber-500 text-white" :
                    "bg-slate-400 text-white"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{courier.name}</div>
                    <div className="text-xs text-slate-600">
                      {courier.totalInspections} {courier.totalInspections === 1 ? "kontrola" : "kontrol"} · {courier.failedInspections}× výhrady
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      courier.issueRate >= 80 ? "text-rose-600" :
                      courier.issueRate >= 50 ? "text-amber-600" :
                      "text-slate-600"
                    }`}>
                      {courier.issueRate}%
                    </div>
                    <div className="text-xs text-slate-500">výhrad</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Celková statistika */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold">📊 Celková statistika</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <div className="text-2xl font-bold">{leaderboard.length}</div>
            <div className="text-sm text-slate-600">Kurýrů celkem</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {leaderboard.filter(c => c.issueRate === 0).length}
            </div>
            <div className="text-sm text-slate-600">Bez jediné výhrady</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">
              {leaderboard.filter(c => c.issueRate > 0 && c.issueRate < 50).length}
            </div>
            <div className="text-sm text-slate-600">S občasnými výhradami</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600">
              {leaderboard.filter(c => c.issueRate >= 50).length}
            </div>
            <div className="text-sm text-slate-600">Potřebují pozornost</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COURIERS VIEW ────────────────────────────────────────────────────────────
function CouriersView({ savedInspections, couriersDB, onAddCourier, onUpdateCourier, onDeleteCourier, onShowAddModal, onShowEditModal }) {
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState(null);

  // Agregace historií kontrol pro každého kurýra
  const courierHistory = useMemo(() => {
    const map = {};

    savedInspections.forEach(insp => {
      insp.couriers.forEach(c => {
        const name = c.name?.trim() || "Bez jména";
        if (!map[name]) {
          map[name] = {
            totalInspections: 0,
            totalIssues: 0,
            lastInspection: null,
            history: []
          };
        }

        map[name].totalInspections += 1;
        if (getCourierResult(c).tone !== "ok") map[name].totalIssues += 1;

        const inspDate = new Date(insp.date);
        if (!map[name].lastInspection || inspDate > new Date(map[name].lastInspection)) {
          map[name].lastInspection = insp.date;
        }

        map[name].history.push({
          date: insp.date,
          result: getCourierResult(c),
          route: c.route,
          vehicle: c.vehicle,
          checks: c.checks,
          inspection: insp
        });
      });
    });

    return map;
  }, [savedInspections]);

  // Spojení kartotéky s historií kontrol
  const enrichedCouriers = useMemo(() => {
    return couriersDB.map(courier => ({
      ...courier,
      history: courierHistory[courier.name] || { totalInspections: 0, totalIssues: 0, history: [] },
      issueRate: courierHistory[courier.name]?.totalInspections > 0
        ? Math.round((courierHistory[courier.name].totalIssues / courierHistory[courier.name].totalInspections) * 100)
        : 0
    }));
  }, [couriersDB, courierHistory]);

  const filteredCouriers = useMemo(() => {
    let result = enrichedCouriers;
    
    // Filtr podle tagu
    if (selectedTagFilter) {
      result = result.filter(c => c.tags && c.tags.includes(selectedTagFilter));
    }
    
    // Filtr podle vyhledávání
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.primaryRoute?.toLowerCase().includes(q) ||
        c.primaryVehicle?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [enrichedCouriers, searchQuery, selectedTagFilter]);

  if (couriersDB.length === 0 && savedInspections.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
          <User className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Kartotéka kurýrů</h2>
          <p className="mt-2 max-w-md text-slate-500">
            Začni přidáním prvního kurýra do kartotéky.
          </p>
          <Button onClick={onShowAddModal} className="mt-4">
            <Plus className="mr-2 h-4 w-4" /> Přidat kurýra
          </Button>
        </div>
      </div>
    );
  }

  if (selectedCourier) {
    const courier = enrichedCouriers.find(c => c.id === selectedCourier);
    if (!courier) {
      setSelectedCourier(null);
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedCourier(null)}>
              ← Zpět
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{courier.name}</h2>
              <p className="text-slate-500">
                {courier.history.totalInspections} {courier.history.totalInspections === 1 ? "kontrola" : courier.history.totalInspections < 5 ? "kontroly" : "kontrol"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onShowEditModal(courier)}>
              <PencilLine className="h-4 w-4 mr-1.5" /> Upravit profil
            </Button>
            <Button variant="destructive" size="sm" onClick={() => {
              onDeleteCourier(courier.id);
              setSelectedCourier(null);
            }}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Smazat
            </Button>
          </div>
        </div>

        {/* Profil kurýra */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Základní info */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold">📋 Základní údaje</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Telefon</div>
                <div className="mt-0.5 font-medium">{courier.phone || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Email</div>
                <div className="mt-0.5 font-medium">{courier.email || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Hlavní trasa</div>
                <div className="mt-0.5 font-medium">{courier.primaryRoute || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Hlavní vozidlo</div>
                <div className="mt-0.5 font-medium">{courier.primaryVehicle || "—"}</div>
              </div>
              {courier.tags && courier.tags.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">Štítky</div>
                  <div className="flex flex-wrap gap-1">
                    {courier.tags.map(tagId => {
                      const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span key={tagId} className={`rounded-full border px-2 py-1 text-xs font-medium ${tag.color}`}>
                          {tag.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistiky */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold">📊 Statistiky</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Kontrol celkem</div>
                <div className="mt-0.5 text-2xl font-bold">{courier.history.totalInspections}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Bez výhrad</div>
                <div className="mt-0.5 text-2xl font-bold text-emerald-600">
                  {courier.history.totalInspections - courier.history.totalIssues}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">S výhradami</div>
                <div className="mt-0.5 text-2xl font-bold text-amber-600">
                  {courier.history.totalIssues}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Míra výhrad</div>
                <div className={`mt-0.5 text-2xl font-bold ${
                  courier.issueRate === 0 ? "text-emerald-600" :
                  courier.issueRate < 30 ? "text-blue-600" :
                  courier.issueRate < 60 ? "text-amber-600" : "text-rose-600"
                }`}>
                  {courier.issueRate}%
                </div>
              </div>
            </div>
          </div>

          {/* Poznámky */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold">📝 Poznámky</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {courier.notes || "Žádné poznámky"}
            </p>
          </div>
        </div>

        {/* Historie kontrol */}
        {courier.history.history.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold">📅 Historie kontrol</h3>
            <div className="space-y-2">
              {courier.history.history.sort((a, b) => new Date(b.date) - new Date(a.date)).map((h, i) => {
                const issueChecks = CHECKS.filter(ch => h.checks?.[ch.id]?.status !== "ok");
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      h.result.tone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {h.result.tone === "ok" ? "✓" : "✗"}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{formatDate(h.date)}</span>
                        {h.route && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{h.route}</span>}
                        {h.vehicle && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{h.vehicle}</span>}
                      </div>
                      {issueChecks.length > 0 && (
                        <div className="mt-1 text-sm text-slate-600">
                          Výhrady: {issueChecks.map(ch => ch.short).join(", ")}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      h.result.tone === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {h.result.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">👥 Kartotéka kurýrů</h2>
          <p className="text-slate-500">
            {filteredCouriers.length} {filteredCouriers.length === 1 ? "kurýr" : filteredCouriers.length < 5 ? "kurýři" : "kurýrů"} v databázi
          </p>
        </div>
        <Button onClick={onShowAddModal}>
          <Plus className="mr-2 h-4 w-4" /> Přidat kurýra
        </Button>
      </div>

      {/* Vyhledávání */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Hledat kurýra..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-base outline-none focus:border-slate-400"
        />
      </div>

      {/* Filtr podle tagů */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedTagFilter(null)}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
            !selectedTagFilter
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Všichni ({enrichedCouriers.length})
        </button>
        {AVAILABLE_TAGS.map(tag => {
          const count = enrichedCouriers.filter(c => c.tags && c.tags.includes(tag.id)).length;
          if (count === 0) return null;
          
          return (
            <button
              key={tag.id}
              onClick={() => setSelectedTagFilter(tag.id === selectedTagFilter ? null : tag.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                selectedTagFilter === tag.id
                  ? tag.color + " border-current"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tag.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Seznam kurýrů */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCouriers.map(courier => (
          <button
            key={courier.id}
            onClick={() => setSelectedCourier(courier.id)}
            className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-slate-950 hover:shadow-lg transition active:scale-95"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <User className="h-6 w-6" />
              </div>
              {courier.history.totalInspections > 0 && (
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                  courier.issueRate === 0 ? "bg-emerald-100 text-emerald-700" :
                  courier.issueRate < 30 ? "bg-blue-100 text-blue-700" :
                  courier.issueRate < 60 ? "bg-amber-100 text-amber-700" :
                  "bg-rose-100 text-rose-700"
                }`}>
                  {courier.issueRate}% výhrad
                </span>
              )}
            </div>
            <div className="font-bold text-lg mb-1">{courier.name}</div>

            {/* Tagy */}
            {courier.tags && courier.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {courier.tags.map(tagId => {
                  const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span key={tagId} className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tag.color}`}>
                      {tag.label}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="text-sm text-slate-500 space-y-1">
              {courier.primaryRoute && <div>🚚 {courier.primaryRoute}</div>}
              {courier.primaryVehicle && <div>🚗 {courier.primaryVehicle}</div>}
              {courier.phone && <div>📞 {courier.phone}</div>}
            </div>
            {courier.history.totalInspections > 0 && (
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 font-medium">
                  {courier.history.totalInspections} {courier.history.totalInspections === 1 ? "kontrola" : "kontrol"}
                </span>
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 font-medium">
                  ✓ {courier.history.totalInspections - courier.history.totalIssues}
                </span>
                {courier.history.totalIssues > 0 && (
                  <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-1 font-medium">
                    ✗ {courier.history.totalIssues}
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {filteredCouriers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-slate-500">Žádní kurýři nevyhovují hledání.</p>
        </div>
      )}
    </div>
  );
}

// ─── SELECT COURIERS MODAL ────────────────────────────────────────────────────
function SelectCouriersModal({ couriersDB, savedInspections, onSelect, onClose }) {
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Vypočítej statistiky pro každého kurýra (smart alerts)
  const couriersWithStats = useMemo(() => {
    return couriersDB.map(courier => {
      // Najdi všechny kontroly tohoto kurýra
      const courierInspections = [];
      savedInspections.forEach(insp => {
        const found = insp.couriers.find(c =>
          c.name?.trim().toLowerCase() === courier.name?.trim().toLowerCase()
        );
        if (found) {
          courierInspections.push({ ...found, date: insp.date });
        }
      });

      // Vypočítej statistiky
      const totalInspections = courierInspections.length;
      const issuesCount = courierInspections.filter(c => getCourierResult(c).tone !== "ok").length;
      const lastInspection = courierInspections.length > 0
        ? courierInspections.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
        : null;

      // Kolik dní od poslední kontroly
      const daysSinceLastInspection = lastInspection
        ? Math.floor((new Date() - new Date(lastInspection)) / (1000 * 60 * 60 * 24))
        : null;

      // Výhrady za poslední měsíc
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const recentIssues = courierInspections.filter(c =>
        new Date(c.date) >= monthAgo && getCourierResult(c).tone !== "ok"
      ).length;

      return {
        ...courier,
        stats: {
          totalInspections,
          issuesCount,
          lastInspection,
          daysSinceLastInspection,
          recentIssues
        }
      };
    });
  }, [couriersDB, savedInspections]);

  const filteredCouriers = useMemo(() => {
    if (!searchQuery.trim()) return couriersWithStats;
    const q = searchQuery.toLowerCase();
    return couriersWithStats.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.primaryRoute?.toLowerCase().includes(q) ||
      c.primaryVehicle?.toLowerCase().includes(q)
    );
  }, [couriersWithStats, searchQuery]);

  function toggleCourier(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selected.length === filteredCouriers.length) {
      setSelected([]);
    } else {
      setSelected(filteredCouriers.map(c => c.id));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-bold">Přidat kurýry z kartotéky</h2>
            <p className="mt-1 text-sm text-slate-500">
              Vyber kurýry, které chceš přidat do kontroly
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Select All */}
        <div className="px-6 py-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat kurýra..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={toggleAll}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 underline"
            >
              {selected.length === filteredCouriers.length ? "Zrušit vše" : "Vybrat vše"}
            </button>
            <span className="text-sm text-slate-500">
              Vybráno: {selected.length} / {filteredCouriers.length}
            </span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredCouriers.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-500">
              Žádní kurýři nenalezeni
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCouriers.map(courier => {
                const isSelected = selected.includes(courier.id);
                const { stats } = courier;

                // Smart alerts
                const hasRecentIssues = stats.recentIssues >= 3;
                const notCheckedLongTime = stats.daysSinceLastInspection && stats.daysSinceLastInspection > 14;
                const hasAlerts = hasRecentIssues || notCheckedLongTime;

                return (
                  <button
                    key={courier.id}
                    onClick={() => toggleCourier(courier.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-slate-950 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition mt-0.5 ${
                        isSelected
                          ? "border-slate-950 bg-slate-950"
                          : "border-slate-300"
                      }`}>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">{courier.name}</span>
                          {hasAlerts && (
                            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">
                              ⚠
                            </span>
                          )}
                        </div>
                        
                        {/* Tagy */}
                        {courier.tags && courier.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {courier.tags.map(tagId => {
                              const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
                              if (!tag) return null;
                              return (
                                <span key={tagId} className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tag.color}`}>
                                  {tag.label}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-sm text-slate-600 mb-2">
                          {courier.primaryRoute && (
                            <span className="rounded-lg bg-slate-100 px-2 py-1">
                              🚚 {courier.primaryRoute}
                            </span>
                          )}
                          {courier.primaryVehicle && (
                            <span className="rounded-lg bg-slate-100 px-2 py-1">
                              🚗 {courier.primaryVehicle}
                            </span>
                          )}
                        </div>

                        {/* Smart Alerts */}
                        {hasAlerts && (
                          <div className="space-y-1 mt-2">
                            {hasRecentIssues && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-700">
                                <span className="font-bold">⚠️</span>
                                <span>
                                  {stats.recentIssues}× výhrady za poslední měsíc
                                </span>
                              </div>
                            )}
                            {notCheckedLongTime && (
                              <div className="flex items-center gap-1.5 text-xs text-blue-700">
                                <span className="font-bold">📅</span>
                                <span>
                                  Poslední kontrola: před {stats.daysSinceLastInspection} dny
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        {stats.totalInspections > 0 && (
                          <div className="flex gap-3 mt-2 text-xs text-slate-500">
                            <span>{stats.totalInspections} kontrol</span>
                            {stats.issuesCount > 0 && (
                              <span className="text-amber-600 font-medium">
                                {stats.issuesCount}× výhrady
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Zrušit
          </Button>
          <Button
            onClick={() => onSelect(selected)}
            disabled={selected.length === 0}
          >
            Přidat {selected.length > 0 && `(${selected.length})`}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── COURIER EDIT MODAL ───────────────────────────────────────────────────────
function CourierEditModal({ courier, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: courier?.name || "",
    phone: courier?.phone || "",
    email: courier?.email || "",
    primaryRoute: courier?.primaryRoute || "",
    primaryVehicle: courier?.primaryVehicle || "",
    notes: courier?.notes || "",
    tags: courier?.tags || [],
  });

  function toggleTag(tagId) {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId]
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vyplň jméno kurýra");
      return;
    }
    onSave(formData);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {courier ? "Upravit kurýra" : "Přidat kurýra"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Základní informace o kurýrovi
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Jméno a příjmení *
              </span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
                placeholder="Jan Novák"
                required
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Telefon
              </span>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
                placeholder="+420 123 456 789"
              />
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Email
              </span>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
                placeholder="jan.novak@email.cz"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Hlavní trasa
              </span>
              <input
                type="text"
                value={formData.primaryRoute}
                onChange={(e) => setFormData({ ...formData, primaryRoute: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
                placeholder="12A"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Hlavní vozidlo (SPZ)
              </span>
              <input
                type="text"
                value={formData.primaryVehicle}
                onChange={(e) => setFormData({ ...formData, primaryVehicle: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
                placeholder="1AB 2345"
              />
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Poznámky
              </span>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-slate-400"
                placeholder="Např. pracuje jen ranní směny, potřebuje opakovaný trénink..."
              />
            </label>

            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Štítky
              </span>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map(tag => {
                  const isSelected = formData.tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? tag.color + " border-current"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {isSelected && "✓ "}
                      {tag.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Vyber štítky pro kategorizaci kurýra
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {courier ? "Uložit změny" : "Přidat kurýra"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── DRAFT SWITCHER MODAL (REMOVED) ──────────────────────────────────────────

