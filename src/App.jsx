import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardCheck, FileText, Plus, Trash2, Save, RotateCcw, Search, CheckCircle2, AlertTriangle, XCircle, Printer, BarChart2, Archive, X, Shirt, PencilLine, FolderOpen, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from "recharts";

function Button({ children, className = "", variant = "default", size = "md", ...props }) {
  const base = "inline-flex items-center justify-center rounded-2xl font-semibold transition disabled:pointer-events-none disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    default: "bg-slate-950 text-white hover:bg-slate-800",
    outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-100",
    destructive: "bg-rose-600 text-white hover:bg-rose-700",
    success: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    blue: "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50",
  };
  return (
    <button className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) { return <div className={`bg-white ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }) { return <div className={className}>{children}</div>; }

const STORAGE_KEY = "courier-check-v1";
const ARCHIVE_KEY = "courier-stats-archive-v1";
const DRAFTS_KEY = "courier-drafts-v1";

const CHECKS = [
  { id: "serviceCrosses", title: "Servisní kříže na balících", short: "Serv. kříže", description: "Kontrola, zda jsou na balících správně vyplněné servisní kříže.", quickNotes: ["Chybějící servisní kříž","Špatně vyplněný servisní kříž","Kurýr proškolen","Opraveno na místě","Nutná opakovaná kontrola"] },
  { id: "returnsSorting", title: "Třídění vrácených balíků do klecí", short: "Vrácené balíky", description: "Kontrola správného roztřídění vrácených balíků do určených klecí.", quickNotes: ["Špatná klec","Balík ponechán mimo klec","Nedodržen postup třídění","Kurýr proškolen","Nutná opakovaná kontrola"] },
  { id: "vehicleCleanliness", title: "Čistota vozidla", short: "Čistota vozidla", description: "Kontrola kabiny i nákladového prostoru.", quickNotes: ["Nepořádek v kabině","Nepořádek v nákladovém prostoru","Zbytky obalů / odpadky","Kurýr upozorněn","Opraveno na místě"] },
  { id: "uniform", title: "Uniforma", short: "Uniforma", description: "Kontrola předepsaného vzhledu a pracovního oblečení.", quickNotes: ["Chybí část uniformy","Nevhodné oblečení","Neupravený vzhled","Kurýr upozorněn","Nutná opakovaná kontrola"] },
  { id: "vehicleCondition", title: "Stav vozidla", short: "Stav vozidla", description: "Kontrola vizuálního a technického stavu vozidla.", quickNotes: ["Poškození karoserie","Problém se světly","Problém s pneumatikami","Chybějící výbava","Nutné nahlásit závadu"] },
];

const STATUS_OPTIONS = [
  { value: "ok", label: "V pořádku", icon: CheckCircle2, weight: 0 },
  { value: "warning", label: "Výhrada", icon: AlertTriangle, weight: 1 },
  { value: "fail", label: "Nevyhovuje", icon: XCircle, weight: 2 },
];
const ACTION_OPTIONS = ["Bez opatření","Kurýr upozorněn","Kurýr proškolen","Opraveno na místě","Opakovaná kontrola","Předat vedoucímu"];
const UNIFORM_ITEMS = ["Triko","Košile","Kraťasy/Kalhoty","Vesta","Bunda"];
const UNIFORM_SIZES = ["XS","S","M","L","XL","XXL","3XL"];
const UNIFORM_PANTS_SIZES = ["30","32","34","36","38","40","42","44","46"];

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
  if (s <= 3) return { label: "Vyhověl s výhradou", tone: "warning" };
  return { label: "Nevyhověl", tone: "fail" };
}
function statusClasses(v) {
  if (v === "ok") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (v === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}
function resultClasses(tone) {
  if (tone === "ok") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (tone === "warning") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}
function computeSummary(couriers) {
  const base = { total: couriers.length, ok: 0, warning: 0, fail: 0, actions: {}, issues: {} };
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
    if (status === "warning") return { s: "⚠", cls: "text-amber-600 font-bold" };
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
        {[{ label: "Kontrolováno", value: summary.total, cls: "border-slate-300" }, { label: "✓ Vyhovělo", value: summary.ok, cls: "border-emerald-300 bg-emerald-50" }, { label: "⚠ S výhradou", value: summary.warning, cls: "border-amber-300 bg-amber-50" }, { label: "✗ Nevyhověl", value: summary.fail, cls: "border-rose-300 bg-rose-50" }].map(s => (
          <div key={s.label} className={`border rounded-xl p-2 text-center ${s.cls}`}>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs font-semibold text-slate-600">{s.label}</div>
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
                    <td className={`border-b border-slate-200 px-2 py-1.5 text-center font-bold ${result.tone === "ok" ? "text-emerald-700" : result.tone === "warning" ? "text-amber-600" : "text-rose-600"}`}>{result.label}</td>
                    <td className="border-b border-slate-200 px-2 py-1.5">{courier.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span><strong className="text-emerald-700">✓</strong> V pořádku</span><span><strong className="text-amber-600">⚠</strong> Výhrada</span><span><strong className="text-rose-600">✗</strong> Nevyhovuje</span>
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
  const [archive, setArchive] = useState(() => {
    try { const s = localStorage.getItem(ARCHIVE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [drafts, setDrafts] = useState(() => {
    try { const s = localStorage.getItem(DRAFTS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showDrafts, setShowDrafts] = useState(false);

  useEffect(() => { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive)); }, [archive]);
  useEffect(() => { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); }, [drafts]);
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (s) { const parsed = JSON.parse(s); setInspection(parsed); }
    } catch (e) { console.warn("Nelze načíst uloženou kontrolu", e); }
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(inspection)); }, [inspection]);

  const activeCourier = inspection.couriers.find(c => c.id === activeCourierId) || null;
  const filteredCouriers = useMemo(() => {
    const v = query.trim().toLowerCase();
    if (!v) return inspection.couriers;
    return inspection.couriers.filter(c => [c.name, c.route, c.vehicle].join(" ").toLowerCase().includes(v));
  }, [inspection.couriers, query]);
  const summary = useMemo(() => computeSummary(inspection.couriers), [inspection.couriers]);

  function updateInspection(field, value) { setInspection(cur => ({ ...cur, [field]: value })); }
  function addCourier() { const c = createEmptyCourier(); setInspection(cur => ({ ...cur, couriers: [c, ...cur.couriers] })); setActiveCourierId(c.id); }
  function updateCourier(id, fn) { setInspection(cur => ({ ...cur, couriers: cur.couriers.map(c => c.id === id ? fn(c) : c) })); }
  function deleteCourier(id) { setInspection(cur => ({ ...cur, couriers: cur.couriers.filter(c => c.id !== id) })); if (activeCourierId === id) setActiveCourierId(null); }

  function archiveAndReset() {
    if (inspection.couriers.length === 0) { alert("Nejsou žádní kurýři k archivaci."); return; }
    if (!window.confirm(`Archivovat tuto kontrolu (${inspection.couriers.length} kurýrů) a začít novou?`)) return;
    setArchive(prev => [...prev, { ...inspection, archivedAt: new Date().toISOString() }]);
    setInspection({ date: todayISO(), depot: inspection.depot, inspector: inspection.inspector, shift: inspection.shift, note: "", couriers: [] });
    setActiveCourierId(null);
  }

  function resetInspection() {
    if (!window.confirm("Začít novou prázdnou kontrolu? Neuložená data se smažou.")) return;
    setInspection({ date: todayISO(), depot: inspection.depot, inspector: inspection.inspector, shift: "Ranní kontrola", note: "", couriers: [] });
    setActiveCourierId(null);
  }

  function loadArchiveToEditor(insp) {
    if (!window.confirm(`Načíst kontrolu ze dne ${formatDate(insp.date)} do editoru? Aktuální rozdělaná kontrola se přepíše.`)) return;
    setInspection({ ...insp });
    setActiveCourierId(null); setActiveTab("check");
  }

  function saveEditedBackToArchive() {
    if (!window.confirm("Uložit změny zpět do archivu? Původní záznam se přepíše.")) return;
    const archivedAt = inspection.archivedAt;
    if (!archivedAt) { alert("Tato kontrola není z archivu."); return; }
    setArchive(prev => prev.map(a => a.archivedAt === archivedAt ? { ...inspection } : a));
    alert("Uloženo do archivu.");
  }

  function addQuickNote(courierId, checkId, text) {
    updateCourier(courierId, c => {
      const cur = c.checks?.[checkId]?.note || "";
      return { ...c, checks: { ...c.checks, [checkId]: { ...(c.checks?.[checkId] || { status: "ok" }), note: cur ? `${cur}\n${text}` : text } } };
    });
  }

  function saveCurrentToDrafts(insp) {
    // Přidá nebo aktualizuje aktuální kontrolu v seznamu draftů
    const withId = insp.id ? insp : { ...insp, id: crypto.randomUUID() };
    setDrafts(cur => {
      const exists = cur.find(d => d.id === withId.id);
      if (exists) return cur.map(d => d.id === withId.id ? withId : d);
      return [withId, ...cur];
    });
    return withId;
  }

  function switchDraft(id) {
    // Ulož aktuální kontrolu do draftů a přepni na vybranou
    saveCurrentToDrafts(inspection);
    const draft = drafts.find(d => d.id === id);
    if (draft) {
      setInspection(draft);
      setActiveCourierId(null);
      setActiveTab("check");
      setShowDrafts(false);
    }
  }

  function deleteDraft(id) {
    if (window.confirm("Smazat tuto rozpracovanou kontrolu?")) {
      setDrafts(cur => cur.filter(d => d.id !== id));
    }
  }

  function createNewDraft() {
    // Ulož aktuální kontrolu a otevři prázdnou novou
    saveCurrentToDrafts(inspection);
    const newInsp = { id: crypto.randomUUID(), date: todayISO(), depot: inspection.depot, inspector: inspection.inspector, shift: "Ranní kontrola", note: "", couriers: [], createdAt: new Date().toISOString() };
    setInspection(newInsp);
    setActiveCourierId(null);
    setActiveTab("check");
    setShowDrafts(false);
  }

  // Automaticky přidej/aktualizuj aktuální kontrolu v draftech při každé změně (jen pokud má id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!inspection.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts(cur => {
      const exists = cur.find(d => d.id === inspection.id);
      if (exists) return cur.map(d => d.id === inspection.id ? inspection : d);
      return cur;
    });
  }, [inspection]);

  const isEditingArchived = !!inspection.archivedAt;

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

      <header className="print-hide-on-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Kontrola kurýrů</h1>
              <p className="text-sm text-slate-500">Servisní kříže, vratky, vozidlo, uniforma</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button onClick={() => setActiveTab("check")} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "check" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}>
              <ClipboardCheck className="h-4 w-4" /> Kontrola
              {isEditingArchived && <span className="rounded-full bg-amber-400 text-white text-xs px-1.5 py-0.5">archiv</span>}
            </button>
            <button onClick={() => setActiveTab("stats")} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "stats" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}>
              <BarChart2 className="h-4 w-4" /> Statistiky
              {archive.length > 0 && <span className="rounded-full bg-slate-950 text-white text-xs px-1.5 py-0.5">{archive.length}</span>}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "check" && (
              <>
                <Button onClick={addCourier}><Plus className="mr-2 h-4 w-4" /> Přidat kurýra</Button>
                <Button variant="outline" onClick={() => setPrintModal({ type: "inspection", inspection, archive: null })}>
                  <FileText className="mr-2 h-4 w-4" /> Report
                </Button>
                <Button variant="outline" onClick={() => setPrintModal({ type: "uniform", inspection, archive: null })}>
                  <Shirt className="mr-2 h-4 w-4" /> Uniformy
                </Button>
                {isEditingArchived
                  ? <Button variant="success" onClick={saveEditedBackToArchive}><Save className="mr-2 h-4 w-4" /> Uložit do archivu</Button>
                  : <Button variant="success" onClick={archiveAndReset}><Archive className="mr-2 h-4 w-4" /> Archivovat a nová</Button>}
              </>
            )}
            {activeTab === "stats" && archive.length > 0 && (
              <Button variant="outline" onClick={() => setPrintModal({ type: "stats", inspection: null, archive })}>
                <Printer className="mr-2 h-4 w-4" /> PDF statistik
              </Button>
            )}
            <button onClick={() => setShowDrafts(cur => !cur)} className="relative rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
              <FolderOpen className="mr-2 h-4 w-4" /> Rozpracované
              {drafts.length > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-rose-500 text-white text-xs h-5 w-5 flex items-center justify-center">{drafts.length}</span>
              )}
              <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showDrafts ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {activeTab === "stats" ? (
        <main className="print-hide-on-print mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <StatsView
            archive={archive}
            onClearArchive={() => { if (window.confirm("Smazat celý archiv statistik?")) setArchive([]); }}
            onLoadToEditor={loadArchiveToEditor}
            onPrintInspection={(insp) => setPrintModal({ type: "inspection", inspection: insp, archive })}
            onPrintUniform={(insp) => setPrintModal({ type: "uniform", inspection: insp, archive: null })}
          />
        </main>
      ) : (
        <main className="print-hide-on-print mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_1fr]">
          <aside className="space-y-5">
            {isEditingArchived && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                ✏️ Upravuješ archivovanou kontrolu ze dne <strong>{formatDate(inspection.date)}</strong>. Po úpravách klikni „Uložit do archivu".
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
              <StatCard label="Výhrady" value={summary.warning} />
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
                <Button onClick={resetInspection} variant="ghost" className="w-full rounded-2xl text-slate-500">
                  <RotateCcw className="mr-2 h-4 w-4" /> Nová prázdná kontrola
                </Button>
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

      {/* ─── DRAFT SWITCHER MODAL ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDrafts && (
          <motion.div key="dm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DraftSwitcherModal
              drafts={drafts}
              currentId={inspection.id}
              onSwitch={switchDraft}
              onNew={createNewDraft}
              onDelete={deleteDraft}
              onClose={() => setShowDrafts(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
              <div className="grid gap-2 sm:grid-cols-3">
                {STATUS_OPTIONS.map(option => {
                  const Icon = option.icon; const selected = value === option.value;
                  return (
                    <button key={option.value} onClick={() => updateCourier(courier.id, c => ({ ...c, checks: { ...c.checks, [check.id]: { ...(c.checks?.[check.id] || {}), status: option.value } } }))}
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 font-semibold transition ${selected ? statusClasses(option.value) : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"}`}>
                      <Icon className="h-5 w-5" /> {option.label}
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
                      <button key={qn} onClick={() => addQuickNote(courier.id, check.id, qn)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400">+ {qn}</button>
                    ))}
                  </div>
                  <textarea value={note} onChange={e => updateCourier(courier.id, c => ({ ...c, checks: { ...c.checks, [check.id]: { ...(c.checks?.[check.id] || {}), note: e.target.value } } }))}
                    rows={3} placeholder="Doplň poznámku k nedostatku..." className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400" />
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
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => alert("Uloženo automaticky.")}><Save className="mr-2 h-4 w-4" /> Uloženo automaticky</Button>
            <Button variant="destructive" onClick={() => deleteCourier(courier.id)}><Trash2 className="mr-2 h-4 w-4" /> Smazat kurýra</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── STATS VIEW ───────────────────────────────────────────────────────────────
function StatsView({ archive, onClearArchive, onLoadToEditor, onPrintInspection, onPrintUniform }) {
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
    return {
      topCouriers: Object.values(courierMap).map(c => ({ ...c, issueRate: Math.round(c.issues / c.total * 100) })).sort((a, b) => b.issues - a.issues).slice(0, 10),
      topRoutes: Object.values(routeMap).map(r => ({ ...r, issueRate: Math.round(r.issues / r.total * 100) })).sort((a, b) => b.issues - a.issues).slice(0, 10),
      checkCounts, weeks, total: archive.length, totalCouriers: allEntries.length,
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
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">Trend:
            <select value={rangeWeeks} onChange={e => setRangeWeeks(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none">
              <option value={4}>4 týdny</option><option value={8}>8 týdnů</option><option value={12}>12 týdnů</option><option value={26}>26 týdnů</option>
            </select>
          </label>
          <button onClick={onClearArchive} className="text-xs text-slate-400 hover:text-rose-500 transition">Smazat archiv</button>
        </div>
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

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">Archiv kontrol</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Datum</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Depo</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Kontrolující</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold">Směna</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">Kurýrů</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">Výhrad</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">% OK</th>
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">Akce</th>
              </tr>
            </thead>
            <tbody>
              {[...archive].reverse().map((insp, i) => {
                const ok = insp.couriers.filter(c => getCourierResult(c).tone === "ok").length;
                const pct = insp.couriers.length > 0 ? Math.round(ok / insp.couriers.length * 100) : 100;
                return (
                  <tr key={insp.archivedAt} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="border-b border-slate-100 px-3 py-2 font-medium">{formatDate(insp.date)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.depot}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.inspector}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.shift}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center font-bold">{insp.couriers.length}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center font-bold text-amber-600">{insp.couriers.length - ok}</td>
                    <td className={`border-b border-slate-100 px-3 py-2 text-center font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</td>
                    <td className="border-b border-slate-100 px-2 py-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <Button size="sm" variant="outline" onClick={() => onLoadToEditor(insp)}>
                          <PencilLine className="h-3.5 w-3.5 mr-1" /> Upravit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onPrintInspection(insp)}>
                          <FileText className="h-3.5 w-3.5 mr-1" /> Report
                        </Button>
                        <Button size="sm" variant="blue" onClick={() => onPrintUniform(insp)}>
                          <Shirt className="h-3.5 w-3.5 mr-1" /> Uniformy
                        </Button>
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

// ─── DRAFT SWITCHER MODAL ─────────────────────────────────────────────────────
function DraftSwitcherModal({ drafts, currentId, onSwitch, onNew, onDelete, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold">Rozpracované kontroly</h2>
            <p className="text-xs text-slate-500 mt-0.5">Přepni mezi rozdělanými kontrolami nebo začni novou</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-auto">
          {drafts.map(draft => {
            const isCurrent = draft.id === currentId;
            const filled = draft.couriers?.length ?? 0;
            const issues = draft.couriers?.filter(c => getCourierResult(c).tone !== "ok").length ?? 0;
            return (
              <div key={draft.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition ${isCurrent ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                <button className="flex-1 text-left" onClick={() => !isCurrent && onSwitch(draft.id)}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{formatDate(draft.date) || "Bez data"}</span>
                    {isCurrent && <span className="rounded-full bg-slate-950 text-white text-xs px-2 py-0.5">aktivní</span>}
                    {draft.archivedAt && <span className="rounded-full bg-amber-100 text-amber-700 text-xs px-2 py-0.5">z archivu</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {draft.shift} · {draft.depot} · {filled} kurýrů
                    {issues > 0 && <span className="text-amber-600 ml-1">· {issues} výhrad</span>}
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isCurrent && (
                    <Button size="sm" variant="outline" onClick={() => onSwitch(draft.id)}>
                      <FolderOpen className="h-3.5 w-3.5 mr-1" /> Otevřít
                    </Button>
                  )}
                  {!isCurrent && (
                    <button onClick={() => onDelete(draft.id)}
                      className="rounded-xl p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 pb-4 pt-2 border-t border-slate-100">
          <Button onClick={onNew} className="w-full gap-2">
            <Plus className="h-4 w-4" /> Začít novou prázdnou kontrolu
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

