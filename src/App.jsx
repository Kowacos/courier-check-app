import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, FileText, Plus, Trash2, Save, RotateCcw, Search, CheckCircle2, AlertTriangle, XCircle, Printer, BarChart2, Archive } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from "recharts";
function Button({ children, className = "", variant = "default", ...props }) {
  const base = "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-slate-950 text-white hover:bg-slate-800",
    outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-100",
    destructive: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
      <button className={`${base} ${variants[variant] || variants.default} ${className}`} {...props}>
        {children}
      </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

const STORAGE_KEY = "courier-check-v1";
const ARCHIVE_KEY = "courier-stats-archive-v1";

const CHECKS = [
  {
    id: "serviceCrosses",
    title: "Servisní kříže na balících",
    short: "Servisní kříže",
    description: "Kontrola, zda jsou na balících správně vyplněné servisní kříže.",
    quickNotes: [
      "Chybějící servisní kříž",
      "Špatně vyplněný servisní kříž",
      "Kurýr proškolen",
      "Opraveno na místě",
      "Nutná opakovaná kontrola",
    ],
  },
  {
    id: "returnsSorting",
    title: "Třídění vrácených balíků do klecí",
    short: "Vrácené balíky",
    description: "Kontrola správného roztřídění vrácených balíků do určených klecí.",
    quickNotes: [
      "Špatná klec",
      "Balík ponechán mimo klec",
      "Nedodržen postup třídění",
      "Kurýr proškolen",
      "Nutná opakovaná kontrola",
    ],
  },
  {
    id: "vehicleCleanliness",
    title: "Čistota vozidla",
    short: "Čistota vozidla",
    description: "Kontrola kabiny i nákladového prostoru.",
    quickNotes: [
      "Nepořádek v kabině",
      "Nepořádek v nákladovém prostoru",
      "Zbytky obalů / odpadky",
      "Kurýr upozorněn",
      "Opraveno na místě",
    ],
  },
  {
    id: "uniform",
    title: "Uniforma",
    short: "Uniforma",
    description: "Kontrola předepsaného vzhledu a pracovního oblečení.",
    quickNotes: [
      "Chybí část uniformy",
      "Nevhodné oblečení",
      "Neupravený vzhled",
      "Kurýr upozorněn",
      "Nutná opakovaná kontrola",
    ],
  },
  {
    id: "vehicleCondition",
    title: "Stav vozidla",
    short: "Stav vozidla",
    description: "Kontrola vizuálního a technického stavu vozidla.",
    quickNotes: [
      "Poškození karoserie",
      "Problém se světly",
      "Problém s pneumatikami",
      "Chybějící výbava",
      "Nutné nahlásit závadu",
    ],
  },
];

const STATUS_OPTIONS = [
  { value: "ok", label: "V pořádku", icon: CheckCircle2, weight: 0 },
  { value: "warning", label: "Výhrada", icon: AlertTriangle, weight: 1 },
  { value: "fail", label: "Nevyhovuje", icon: XCircle, weight: 2 },
];

const ACTION_OPTIONS = ["Bez opatření", "Kurýr upozorněn", "Kurýr proškolen", "Opraveno na místě", "Opakovaná kontrola", "Předat vedoucímu"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}. ${month}. ${year}`;
}

function emptyChecks() {
  return CHECKS.reduce((acc, check) => {
    acc[check.id] = { status: "ok", note: "" };
    return acc;
  }, {});
}

const UNIFORM_ITEMS = ["Triko", "Košile", "Kraťasy/Kalhoty", "Vesta", "Bunda"];
const UNIFORM_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const UNIFORM_PANTS_SIZES = ["30", "32", "34", "36", "38", "40", "42", "44", "46"];

function createEmptyCourier() {
  return {
    id: crypto.randomUUID(),
    name: "",
    route: "",
    vehicle: "",
    checks: emptyChecks(),
    action: "Bez opatření",
    generalNote: "",
    uniformDetails: { size: "", pantsSize: "", missing: [], needsReorder: false },
    createdAt: new Date().toISOString(),
  };
}

function getCourierScore(courier) {
  return CHECKS.reduce((sum, check) => {
    const status = courier.checks?.[check.id]?.status || "ok";
    return sum + (STATUS_OPTIONS.find((item) => item.value === status)?.weight || 0);
  }, 0);
}

function getCourierResult(courier) {
  const score = getCourierScore(courier);
  if (score === 0) return { label: "Vyhověl", tone: "ok" };
  if (score <= 3) return { label: "Vyhověl s výhradou", tone: "warning" };
  return { label: "Nevyhověl", tone: "fail" };
}

function statusClasses(value) {
  if (value === "ok") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function resultClasses(tone) {
  if (tone === "ok") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (tone === "warning") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

function computeSummary(couriers) {
  const base = { total: couriers.length, ok: 0, warning: 0, fail: 0, actions: {}, issues: {} };
  couriers.forEach((courier) => {
    const result = getCourierResult(courier);
    base[result.tone] += 1;
    base.actions[courier.action] = (base.actions[courier.action] || 0) + 1;
    CHECKS.forEach((check) => {
      const status = courier.checks?.[check.id]?.status || "ok";
      if (status !== "ok") base.issues[check.short] = (base.issues[check.short] || 0) + 1;
    });
  });
  return base;
}

export default function CourierCheckApp() {
  const [inspection, setInspection] = useState(() => ({
    date: todayISO(),
    depot: "Tucho",
    inspector: "Michal Přeček",
    shift: "Odpolední kontrola",
    note: "",
    couriers: [],
  }));
  const [activeCourierId, setActiveCourierId] = useState(null);
  const [query, setQuery] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState("check"); // "check" | "stats"
  const [archivePrintTarget, setArchivePrintTarget] = useState(null);
  const [archive, setArchive] = useState(() => {
    try {
      const saved = localStorage.getItem(ARCHIVE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  }, [archive]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setInspection(JSON.parse(saved));
    } catch (error) {
      console.error("Nepodařilo se načíst uloženou kontrolu", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inspection));
  }, [inspection]);

  const activeCourier = inspection.couriers.find((courier) => courier.id === activeCourierId) || null;

  const filteredCouriers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return inspection.couriers;
    return inspection.couriers.filter((courier) =>
        [courier.name, courier.route, courier.vehicle].join(" ").toLowerCase().includes(value)
    );
  }, [inspection.couriers, query]);

  const summary = useMemo(() => {
    const base = {
      total: inspection.couriers.length,
      ok: 0,
      warning: 0,
      fail: 0,
      actions: {},
      issues: {},
    };

    inspection.couriers.forEach((courier) => {
      const result = getCourierResult(courier);
      base[result.tone] += 1;
      base.actions[courier.action] = (base.actions[courier.action] || 0) + 1;
      CHECKS.forEach((check) => {
        const status = courier.checks?.[check.id]?.status || "ok";
        if (status !== "ok") base.issues[check.short] = (base.issues[check.short] || 0) + 1;
      });
    });

    return base;
  }, [inspection.couriers]);

  function updateInspection(field, value) {
    setInspection((current) => ({ ...current, [field]: value }));
  }

  function addCourier() {
    const courier = createEmptyCourier();
    setInspection((current) => ({ ...current, couriers: [courier, ...current.couriers] }));
    setActiveCourierId(courier.id);
    setShowReport(false);
  }

  function updateCourier(courierId, updater) {
    setInspection((current) => ({
      ...current,
      couriers: current.couriers.map((courier) => (courier.id === courierId ? updater(courier) : courier)),
    }));
  }

  function deleteCourier(courierId) {
    setInspection((current) => ({ ...current, couriers: current.couriers.filter((courier) => courier.id !== courierId) }));
    if (activeCourierId === courierId) setActiveCourierId(null);
  }

  function archiveAndReset() {
    if (inspection.couriers.length === 0) {
      alert("Nejsou žádní kurýři k archivaci.");
      return;
    }
    const confirmed = window.confirm(`Archivovat tuto kontrolu (${inspection.couriers.length} kurýrů) a začít novou?`);
    if (!confirmed) return;
    setArchive((prev) => [...prev, { ...inspection, archivedAt: new Date().toISOString() }]);
    setInspection({
      date: todayISO(),
      depot: inspection.depot,
      inspector: inspection.inspector,
      shift: inspection.shift,
      note: "",
      couriers: [],
    });
    setActiveCourierId(null);
    setShowReport(false);
  }

  function resetInspection() {
    const confirmed = window.confirm("Opravdu chceš začít novou kontrolu? Aktuální data se smažou z tohoto zařízení.");
    if (!confirmed) return;
    setInspection({
      date: todayISO(),
      depot: "Mělník",
      inspector: "Michal Přeček",
      shift: "Ranní kontrola",
      note: "",
      couriers: [],
    });
    setActiveCourierId(null);
    setShowReport(false);
  }

  function addQuickNote(courierId, checkId, text) {
    updateCourier(courierId, (courier) => {
      const currentNote = courier.checks?.[checkId]?.note || "";
      const nextNote = currentNote ? `${currentNote}\n${text}` : text;
      return {
        ...courier,
        checks: {
          ...courier.checks,
          [checkId]: {
            ...(courier.checks?.[checkId] || { status: "ok" }),
            note: nextNote,
          },
        },
      };
    });
  }

  function printReport() {
    setShowReport(true);
    setTimeout(() => window.print(), 150);
  }

  function printArchiveInspection(insp) {
    setArchivePrintTarget(insp);
    setTimeout(() => {
      window.print();
      setArchivePrintTarget(null);
    }, 200);
  }

  return (
      <div className="min-h-screen bg-slate-100 text-slate-950 print:bg-white">
        <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .report-card { box-shadow: none !important; border: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
          table { font-size: 9pt !important; }
          th, td { padding: 3pt 5pt !important; }
        }
        .print-only { display: none; }
      `}</style>

        <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
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
            {/* TABS */}
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => setActiveTab("check")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "check" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}
              >
                <ClipboardCheck className="h-4 w-4" /> Kontrola
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "stats" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-800"}`}
              >
                <BarChart2 className="h-4 w-4" /> Statistiky
                {archive.length > 0 && <span className="rounded-full bg-slate-950 text-white text-xs px-1.5 py-0.5">{archive.length}</span>}
              </button>
            </div>
            {activeTab === "check" && (
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={addCourier} className="rounded-2xl">
                  <Plus className="mr-2 h-4 w-4" /> Přidat kurýra
                </Button>
                <Button onClick={() => setShowReport(true)} variant="outline" className="rounded-2xl">
                  <FileText className="mr-2 h-4 w-4" /> Náhled reportu
                </Button>
                <Button onClick={printReport} variant="outline" className="rounded-2xl">
                  <Printer className="mr-2 h-4 w-4" /> PDF / tisk
                </Button>
                <Button onClick={archiveAndReset} variant="outline" className="rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Archive className="mr-2 h-4 w-4" /> Archivovat a nová
                </Button>
              </div>
            )}
          </div>
        </header>

        {activeTab === "stats" ? (
          <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 no-print">
            <StatsView
              archive={archive}
              onClearArchive={() => { if(window.confirm("Opravdu smazat celý archiv statistik?")) setArchive([]); }}
              onPrintInspection={printArchiveInspection}
            />
          </main>
        ) : (
        <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_1fr] print:block print:max-w-none print:p-0">
          <aside className="no-print space-y-5">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Datum
                    <input
                        type="date"
                        value={inspection.date}
                        onChange={(event) => updateInspection("date", event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Směna
                    <input
                        value={inspection.shift}
                        onChange={(event) => updateInspection("shift", event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400"
                    />
                  </label>
                </div>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Depo / hala
                  <input
                      value={inspection.depot}
                      onChange={(event) => updateInspection("depot", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Kontrolující osoba
                  <input
                      value={inspection.inspector}
                      onChange={(event) => updateInspection("inspector", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Poznámka ke kontrole
                  <textarea
                      value={inspection.note}
                      onChange={(event) => updateInspection("note", event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-slate-400"
                      placeholder="Např. namátková ranní kontrola před výjezdem..."
                  />
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
                  <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Hledat kurýra, trasu, SPZ..."
                      className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:border-slate-400"
                  />
                </div>

                <div className="max-h-[48vh] space-y-2 overflow-auto pr-1">
                  {filteredCouriers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                        Zatím tu není žádný kurýr. Začni tlačítkem „Přidat kurýra“.
                      </div>
                  ) : (
                      filteredCouriers.map((courier) => {
                        const result = getCourierResult(courier);
                        const issueCount = CHECKS.filter((check) => courier.checks?.[check.id]?.status !== "ok").length;
                        return (
                            <button
                                key={courier.id}
                                onClick={() => {
                                  setActiveCourierId(courier.id);
                                  setShowReport(false);
                                }}
                                className={`w-full rounded-2xl border p-3 text-left transition hover:bg-white ${
                                    activeCourierId === courier.id ? "border-slate-950 bg-white shadow-sm" : "border-slate-200 bg-slate-50"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold">{courier.name || "Bez jména"}</div>
                                  <div className="text-sm text-slate-500">
                                    {courier.route || "Bez trasy"} · {courier.vehicle || "Bez vozidla"}
                                  </div>
                                </div>
                                <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${resultClasses(result.tone)}`}>
                            {result.label}
                          </span>
                              </div>
                              {issueCount > 0 && <div className="mt-2 text-xs text-slate-500">Počet výhrad: {issueCount}</div>}
                            </button>
                        );
                      })
                  )}
                </div>

                <Button onClick={resetInspection} variant="ghost" className="w-full rounded-2xl text-slate-500">
                  <RotateCcw className="mr-2 h-4 w-4" /> Nová prázdná kontrola
                </Button>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-5 print:hidden">
            {showReport ? (
                <ReportView inspection={inspection} summary={summary} onPrint={printReport} />
            ) : activeCourier ? (
                <CourierEditor courier={activeCourier} updateCourier={updateCourier} deleteCourier={deleteCourier} addQuickNote={addQuickNote} />
            ) : (
                <EmptyState onAdd={addCourier} />
            )}
          </section>

          <section className="print-only">
            {archivePrintTarget ? (
              <PrintableReport
                inspection={archivePrintTarget}
                summary={computeSummary(archivePrintTarget.couriers)}
                showUniform={false}
              />
            ) : (
              <PrintableReport inspection={inspection} summary={summary} showUniform={true} />
            )}
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
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
            <ClipboardCheck className="h-8 w-8 text-slate-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Začni kontrolu přidáním prvního kurýra</h2>
            <p className="mt-2 max-w-md text-slate-500">
              U každého kurýra odklikáš servisní kříže, vratky do klecí, čistotu vozidla, uniformu a stav vozidla.
            </p>
          </div>
          <Button onClick={onAdd} className="rounded-2xl px-6 py-6 text-base">
            <Plus className="mr-2 h-5 w-5" /> Přidat kurýra
          </Button>
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
              <div>
                <h2 className="text-2xl font-bold">Karta kurýra</h2>
                <p className="text-slate-500">Vyplň základní údaje a odklikej kontrolní body.</p>
              </div>
              <div className={`rounded-full border px-3 py-1.5 text-sm font-bold ${resultClasses(result.tone)}`}>{result.label}</div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Jméno kurýra
                <input
                    value={courier.name}
                    onChange={(event) => updateCourier(courier.id, (current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400"
                    placeholder="Jan Novák"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Trasa
                <input
                    value={courier.route}
                    onChange={(event) => updateCourier(courier.id, (current) => ({ ...current, route: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400"
                    placeholder="12A"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                SPZ / číslo vozidla
                <input
                    value={courier.vehicle}
                    onChange={(event) => updateCourier(courier.id, (current) => ({ ...current, vehicle: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400"
                    placeholder="1AB 2345"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {CHECKS.map((check) => {
          const value = courier.checks?.[check.id]?.status || "ok";
          const note = courier.checks?.[check.id]?.note || "";
          return (
              <Card key={check.id} className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div>
                    <h3 className="text-lg font-bold">{check.title}</h3>
                    <p className="text-sm text-slate-500">{check.description}</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {STATUS_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const selected = value === option.value;
                      return (
                          <button
                              key={option.value}
                              onClick={() =>
                                  updateCourier(courier.id, (current) => ({
                                    ...current,
                                    checks: {
                                      ...current.checks,
                                      [check.id]: { ...(current.checks?.[check.id] || {}), status: option.value },
                                    },
                                  }))
                              }
                              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 font-semibold transition ${
                                  selected ? statusClasses(option.value) : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                              }`}
                          >
                            <Icon className="h-5 w-5" /> {option.label}
                          </button>
                      );
                    })}
                  </div>

                  {/* Sekce objednávky uniformy — zobrazí se vždy, nezávisle na statusu */}
                  {check.id === "uniform" && (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-700">🧥 Evidence uniformy</p>
                        <button
                          onClick={() => updateCourier(courier.id, (c) => ({
                            ...c,
                            uniformDetails: { ...c.uniformDetails, needsReorder: !c.uniformDetails?.needsReorder }
                          }))}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            courier.uniformDetails?.needsReorder
                              ? "border-blue-400 bg-blue-500 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                          }`}
                        >
                          {courier.uniformDetails?.needsReorder ? "✓ Potřebuje doplnit zásobu" : "+ Potřebuje doplnit zásobu"}
                        </button>
                      </div>

                      {courier.uniformDetails?.needsReorder && value === "ok" && (
                        <p className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                          ℹ️ <strong>Nezapočítává se do chyb</strong> — kurýr uniformu má, jen potřebuje doplnit zásobu.
                        </p>
                      )}
                      {value !== "ok" && (
                        <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                          ⚠️ <strong>Započítává se do chyb</strong> — kurýr uniformu nemá nebo je nevyhovující.
                        </p>
                      )}

                      {(value !== "ok" || courier.uniformDetails?.needsReorder) && (
                        <div className="space-y-3 pt-1">
                          <div className="flex flex-wrap gap-2">
                            {UNIFORM_ITEMS.map((item) => {
                              const checked = courier.uniformDetails?.missing?.includes(item);
                              return (
                                <button
                                  key={item}
                                  onClick={() => updateCourier(courier.id, (c) => {
                                    const current = c.uniformDetails?.missing || [];
                                    const next = checked ? current.filter((i) => i !== item) : [...current, item];
                                    return { ...c, uniformDetails: { ...c.uniformDetails, missing: next } };
                                  })}
                                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                                    checked
                                      ? value !== "ok"
                                        ? "border-rose-500 bg-rose-500 text-white"
                                        : "border-blue-500 bg-blue-500 text-white"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                                  }`}
                                >
                                  {checked ? "✓ " : ""}{item}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                              Velikost (oblečení):
                              <select
                                value={courier.uniformDetails?.size || ""}
                                onChange={(e) => updateCourier(courier.id, (c) => ({
                                  ...c, uniformDetails: { ...c.uniformDetails, size: e.target.value }
                                }))}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base outline-none focus:border-slate-400"
                              >
                                <option value="">— vyberte —</option>
                                {UNIFORM_SIZES.map((s) => <option key={s}>{s}</option>)}
                              </select>
                            </label>
                            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                              Velikost kalhot/kraťasů:
                              <select
                                value={courier.uniformDetails?.pantsSize || ""}
                                onChange={(e) => updateCourier(courier.id, (c) => ({
                                  ...c, uniformDetails: { ...c.uniformDetails, pantsSize: e.target.value }
                                }))}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base outline-none focus:border-slate-400"
                              >
                                <option value="">— vyberte —</option>
                                {UNIFORM_PANTS_SIZES.map((s) => <option key={s}>{s}</option>)}
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
                          {check.quickNotes.map((quickNote) => (
                              <button
                                  key={quickNote}
                                  onClick={() => addQuickNote(courier.id, check.id, quickNote)}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
                              >
                                + {quickNote}
                              </button>
                          ))}
                        </div>
                        <textarea
                            value={note}
                            onChange={(event) =>
                                updateCourier(courier.id, (current) => ({
                                  ...current,
                                  checks: {
                                    ...current.checks,
                                    [check.id]: { ...(current.checks?.[check.id] || {}), note: event.target.value },
                                  },
                                }))
                            }
                            rows={3}
                            placeholder="Doplň poznámku k nedostatku..."
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400"
                        />
                      </div>
                  )}
                </CardContent>
              </Card>
          );
        })}

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Opatření
                <select
                    value={courier.action}
                    onChange={(event) => updateCourier(courier.id, (current) => ({ ...current, action: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400"
                >
                  {ACTION_OPTIONS.map((action) => (
                      <option key={action}>{action}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Obecná poznámka ke kurýrovi
                <textarea
                    value={courier.generalNote}
                    onChange={(event) => updateCourier(courier.id, (current) => ({ ...current, generalNote: event.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:border-slate-400"
                    placeholder="Např. domluvena opakovaná kontrola..."
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" className="rounded-2xl" onClick={() => alert("Uloženo automaticky do tohoto zařízení.")}>
                <Save className="mr-2 h-4 w-4" /> Uloženo automaticky
              </Button>
              <Button variant="destructive" className="rounded-2xl" onClick={() => deleteCourier(courier.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Smazat kurýra
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
  );
}

function ReportView({ inspection, summary, onPrint }) {
  return (
      <Card className="report-card rounded-3xl border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-2xl font-bold">Náhled závěrečného reportu</h2>
              <p className="text-slate-500">Takhle se vytiskne nebo uloží jako PDF.</p>
            </div>
            <Button onClick={onPrint} className="rounded-2xl">
              <Printer className="mr-2 h-4 w-4" /> Uložit jako PDF
            </Button>
          </div>
          <PrintableReport inspection={inspection} summary={summary} />
        </CardContent>
      </Card>
  );
}

function StatsView({ archive, onClearArchive, onPrintInspection }) {
  const [rangeWeeks, setRangeWeeks] = useState(8);

  const stats = useMemo(() => {
    if (archive.length === 0) return null;

    // Flatten all couriers from all inspections
    const allEntries = archive.flatMap((insp) =>
      insp.couriers.map((c) => ({ ...c, inspectionDate: insp.date, inspectionId: insp.archivedAt }))
    );

    // Per courier stats
    const courierMap = {};
    allEntries.forEach((c) => {
      const key = c.name?.trim() || "Neznámý";
      if (!courierMap[key]) courierMap[key] = { name: key, total: 0, issues: 0, fail: 0, checks: {} };
      const m = courierMap[key];
      m.total += 1;
      const result = getCourierResult(c);
      if (result.tone !== "ok") m.issues += 1;
      if (result.tone === "fail") m.fail += 1;
      CHECKS.forEach((ch) => {
        if (!m.checks[ch.id]) m.checks[ch.id] = 0;
        if (c.checks?.[ch.id]?.status !== "ok") m.checks[ch.id] += 1;
      });
    });

    // Per route stats
    const routeMap = {};
    allEntries.forEach((c) => {
      const key = c.route?.trim() || "Bez trasy";
      if (!routeMap[key]) routeMap[key] = { route: key, total: 0, issues: 0 };
      routeMap[key].total += 1;
      if (getCourierResult(c).tone !== "ok") routeMap[key].issues += 1;
    });

    // Per check type overall
    const checkCounts = CHECKS.map((ch) => ({
      name: ch.short,
      pocet: allEntries.filter((c) => c.checks?.[ch.id]?.status !== "ok").length,
    }));

    // Trend: group by week (last N weeks)
    const now = new Date();
    const weeks = Array.from({ length: rangeWeeks }, (_, i) => {
      const start = new Date(now);
      start.setDate(now.getDate() - (rangeWeeks - 1 - i) * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const label = `${start.getDate()}.${start.getMonth() + 1}.`;
      const inspInWeek = archive.filter((insp) => {
        const d = new Date(insp.date);
        return d >= start && d <= end;
      });
      const totalC = inspInWeek.reduce((s, insp) => s + insp.couriers.length, 0);
      const issueC = inspInWeek.reduce((s, insp) =>
        s + insp.couriers.filter((c) => getCourierResult(c).tone !== "ok").length, 0);
      return { label, checked: totalC, issues: issueC, inspections: inspInWeek.length };
    });

    const topCouriers = Object.values(courierMap)
      .map((c) => ({ ...c, issueRate: c.total > 0 ? Math.round((c.issues / c.total) * 100) : 0 }))
      .sort((a, b) => b.issues - a.issues)
      .slice(0, 10);

    const topRoutes = Object.values(routeMap)
      .map((r) => ({ ...r, issueRate: r.total > 0 ? Math.round((r.issues / r.total) * 100) : 0 }))
      .sort((a, b) => b.issues - a.issues)
      .slice(0, 10);

    return { topCouriers, topRoutes, checkCounts, weeks, total: archive.length, totalCouriers: allEntries.length };
  }, [archive, rangeWeeks]);

  if (archive.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
          <BarChart2 className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Zatím žádná archivovaná data</h2>
          <p className="mt-2 max-w-md text-slate-500">
            Po každé kontrole klikni na <strong>"Archivovat a nová"</strong> — data se uloží a budou se tu zobrazovat statistiky.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Statistiky a trendy</h2>
          <p className="text-slate-500">Z {stats.total} archivovaných kontrol · {stats.totalCouriers} zkontrolovaných kurýrů</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            Trend:
            <select
              value={rangeWeeks}
              onChange={(e) => setRangeWeeks(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none"
            >
              <option value={4}>4 týdny</option>
              <option value={8}>8 týdnů</option>
              <option value={12}>12 týdnů</option>
              <option value={26}>26 týdnů</option>
            </select>
          </label>
          <button onClick={onClearArchive} className="text-xs text-slate-400 hover:text-rose-500 transition">
            Smazat archiv
          </button>
        </div>
      </div>

      {/* TREND CHART */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">Trend — počet výhrad v čase</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.weeks}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="checked" name="Kontrolováno" stroke="#94a3b8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="issues" name="Výhrady" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* NEJCASTEJSI CHYBY */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">Nejčastější typy chyb</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.checkCounts} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
            <Tooltip />
            <Bar dataKey="pocet" name="Počet" fill="#f59e0b" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* TOP KURYRI */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">Kurýři s nejvíce výhradami</h3>
          <div className="space-y-2">
            {stats.topCouriers.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-slate-400">{i + 1}.</span>
                <span className="w-32 truncate text-sm font-semibold">{c.name}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${stats.topCouriers[0].issues > 0 ? (c.issues / stats.topCouriers[0].issues) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs text-slate-500">{c.issues}× / {c.total} ({c.issueRate}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP TRASY */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">Trasy s nejvíce výhradami</h3>
          <div className="space-y-2">
            {stats.topRoutes.map((r, i) => (
              <div key={r.route} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-slate-400">{i + 1}.</span>
                <span className="w-20 truncate text-sm font-semibold">{r.route}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-400 transition-all"
                    style={{ width: `${stats.topRoutes[0].issues > 0 ? (r.issues / stats.topRoutes[0].issues) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs text-slate-500">{r.issues}× / {r.total} ({r.issueRate}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ARCHIV */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold">Archiv kontrol</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200">
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
                <th className="border-b border-slate-200 px-3 py-2 font-semibold text-center">PDF</th>
              </tr>
            </thead>
            <tbody>
              {[...archive].reverse().map((insp, i) => {
                const ok = insp.couriers.filter((c) => getCourierResult(c).tone === "ok").length;
                const pct = insp.couriers.length > 0 ? Math.round((ok / insp.couriers.length) * 100) : 100;
                return (
                  <tr key={insp.archivedAt} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="border-b border-slate-100 px-3 py-2">{formatDate(insp.date)}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.depot}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.inspector}</td>
                    <td className="border-b border-slate-100 px-3 py-2">{insp.shift}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center font-bold">{insp.couriers.length}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center font-bold text-amber-600">{insp.couriers.length - ok}</td>
                    <td className={`border-b border-slate-100 px-3 py-2 text-center font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-center">
                      <button
                        onClick={() => onPrintInspection(insp)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition"
                        title="Tisk / PDF"
                      >
                        <Printer className="h-3.5 w-3.5" /> PDF
                      </button>
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

function PrintableReport({ inspection, summary, showUniform = true }) {
  const statusSymbol = (status) => {
    if (status === "ok") return { sym: "✓", cls: "text-emerald-700 font-bold text-center" };
    if (status === "warning") return { sym: "⚠", cls: "text-amber-600 font-bold text-center" };
    return { sym: "✗", cls: "text-rose-600 font-bold text-center" };
  };

  const couriersWithNotes = inspection.couriers.filter((c) =>
    CHECKS.some((ch) => c.checks?.[ch.id]?.note) || c.generalNote
  );

  return (
    <div className="space-y-4 bg-white text-slate-950 text-sm print:text-black">

      {/* HLAVIČKA */}
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

      {/* STATISTIKY */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Kontrolováno", value: summary.total, cls: "border-slate-300" },
          { label: "✓ Vyhovělo", value: summary.ok, cls: "border-emerald-300 bg-emerald-50" },
          { label: "⚠ S výhradou", value: summary.warning, cls: "border-amber-300 bg-amber-50" },
          { label: "✗ Nevyhovělo", value: summary.fail, cls: "border-rose-300 bg-rose-50" },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-2 text-center ${s.cls}`}>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs font-semibold text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>

      {/* HLAVNÍ TABULKA */}
      <div>
        <h2 className="text-base font-bold mb-1.5">Přehled kurýrů</h2>
        <div className="overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold">Kurýr</th>
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold">Trasa</th>
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold">Vozidlo</th>
                {CHECKS.map((ch) => (
                  <th key={ch.id} className="border-b border-slate-300 px-1.5 py-1.5 font-semibold text-center">
                    {ch.short}
                  </th>
                ))}
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold text-center">Výsledek</th>
                <th className="border-b border-slate-300 px-2 py-1.5 font-semibold">Opatření</th>
              </tr>
            </thead>
            <tbody>
              {inspection.couriers.length === 0 && (
                <tr>
                  <td colSpan={3 + CHECKS.length + 2} className="p-3 text-center text-slate-400 italic">
                    Žádný kurýr nebyl přidán.
                  </td>
                </tr>
              )}
              {inspection.couriers.map((courier, idx) => {
                const result = getCourierResult(courier);
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50";
                return (
                  <tr key={courier.id} className={rowBg}>
                    <td className="border-b border-slate-200 px-2 py-1.5 font-medium">{courier.name || "Bez jména"}</td>
                    <td className="border-b border-slate-200 px-2 py-1.5">{courier.route || "—"}</td>
                    <td className="border-b border-slate-200 px-2 py-1.5">{courier.vehicle || "—"}</td>
                    {CHECKS.map((ch) => {
                      const status = courier.checks?.[ch.id]?.status || "ok";
                      const { sym, cls } = statusSymbol(status);
                      return (
                        <td key={ch.id} className={`border-b border-slate-200 px-1.5 py-1.5 ${cls}`}>
                          {sym}
                        </td>
                      );
                    })}
                    <td className={`border-b border-slate-200 px-2 py-1.5 text-center text-xs font-bold ${
                      result.tone === "ok" ? "text-emerald-700" :
                      result.tone === "warning" ? "text-amber-600" : "text-rose-600"
                    }`}>
                      {result.label}
                    </td>
                    <td className="border-b border-slate-200 px-2 py-1.5">{courier.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEGENDA */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span><strong className="text-emerald-700">✓</strong> V pořádku</span>
        <span><strong className="text-amber-600">⚠</strong> Výhrada</span>
        <span><strong className="text-rose-600">✗</strong> Nevyhovuje</span>
        <span className="ml-auto italic">Sloupce: Serv. kříže · Vrácené balíky · Čistota vozidla · Uniforma · Stav vozidla</span>
      </div>

      {/* POZNÁMKY — jen pokud existují */}
      {couriersWithNotes.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-1.5">Poznámky k výhradám</h2>
          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border-b border-slate-300 px-2 py-1.5 font-semibold w-32 text-left">Kurýr</th>
                  <th className="border-b border-slate-300 px-2 py-1.5 font-semibold w-32 text-left">Kontrolní bod</th>
                  <th className="border-b border-slate-300 px-2 py-1.5 font-semibold text-left">Poznámka</th>
                </tr>
              </thead>
              <tbody>
                {couriersWithNotes.flatMap((courier) => [
                  ...CHECKS.filter((ch) => courier.checks?.[ch.id]?.note).map((ch) => (
                    <tr key={courier.id + ch.id} className="odd:bg-white even:bg-slate-50">
                      <td className="border-b border-slate-200 px-2 py-1 font-medium">{courier.name || "Bez jména"}</td>
                      <td className="border-b border-slate-200 px-2 py-1">{ch.short}</td>
                      <td className="border-b border-slate-200 px-2 py-1 whitespace-pre-wrap">{courier.checks[ch.id].note}</td>
                    </tr>
                  )),
                  ...(courier.generalNote ? [
                    <tr key={courier.id + "_gen"} className="odd:bg-white even:bg-slate-50">
                      <td className="border-b border-slate-200 px-2 py-1 font-medium">{courier.name || "Bez jména"}</td>
                      <td className="border-b border-slate-200 px-2 py-1 italic text-slate-500">Obecná</td>
                      <td className="border-b border-slate-200 px-2 py-1 whitespace-pre-wrap">{courier.generalNote}</td>
                    </tr>
                  ] : []),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OBJEDNÁVKA UNIFOREM */}
      {showUniform && (() => {
        const uniformIssues = inspection.couriers.filter(
          (c) =>
            (c.checks?.uniform?.status !== "ok" && c.uniformDetails?.missing?.length > 0) ||
            (c.uniformDetails?.needsReorder && c.uniformDetails?.missing?.length > 0) ||
            c.uniformDetails?.size || c.uniformDetails?.pantsSize
        ).filter(
          (c) => c.checks?.uniform?.status !== "ok" || c.uniformDetails?.needsReorder
        );
        if (uniformIssues.length === 0) return null;
        return (
          <div>
            <h2 className="text-base font-bold mb-1.5">🧥 Objednávka uniforem</h2>
            <div className="overflow-hidden rounded-xl border border-amber-300">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="border-b border-amber-200 px-2 py-1.5 font-semibold text-left">Kurýr</th>
                    <th className="border-b border-amber-200 px-2 py-1.5 font-semibold text-left">Trasa</th>
                    <th className="border-b border-amber-200 px-2 py-1.5 font-semibold text-center">Typ</th>
                    <th className="border-b border-amber-200 px-2 py-1.5 font-semibold text-center">Vel. oblečení</th>
                    <th className="border-b border-amber-200 px-2 py-1.5 font-semibold text-center">Vel. kalhot</th>
                    {UNIFORM_ITEMS.map((item) => (
                      <th key={item} className="border-b border-amber-200 px-1.5 py-1.5 font-semibold text-center">{item}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniformIssues.map((courier, idx) => (
                    <tr key={courier.id} className={idx % 2 === 0 ? "bg-white" : "bg-amber-50/40"}>
                      <td className="border-b border-amber-100 px-2 py-1.5 font-medium">{courier.name || "Bez jména"}</td>
                      <td className="border-b border-amber-100 px-2 py-1.5">{courier.route || "—"}</td>
                      <td className="border-b border-amber-100 px-2 py-1.5 text-center">
                        {courier.checks?.uniform?.status !== "ok"
                          ? <span className="rounded-full bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 text-xs font-bold">Chybí</span>
                          : <span className="rounded-full bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs font-bold">Doplnit</span>
                        }
                      </td>
                      <td className="border-b border-amber-100 px-2 py-1.5 text-center font-bold">
                        {courier.uniformDetails?.size || <span className="text-slate-400 font-normal italic">—</span>}
                      </td>
                      <td className="border-b border-amber-100 px-2 py-1.5 text-center font-bold">
                        {courier.uniformDetails?.pantsSize || <span className="text-slate-400 font-normal italic">—</span>}
                      </td>
                      {UNIFORM_ITEMS.map((item) => {
                        const needs = courier.uniformDetails?.missing?.includes(item);
                        return (
                          <td key={item} className={`border-b border-amber-100 px-1.5 py-1.5 text-center font-bold ${needs ? "text-rose-600" : "text-slate-300"}`}>
                            {needs ? "✗" : "·"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-amber-50">
                  <tr>
                    <td colSpan={5} className="px-2 py-1.5 text-xs font-semibold text-slate-600">Celkový počet kusů k objednání:</td>
                    {UNIFORM_ITEMS.map((item) => {
                      const count = uniformIssues.filter((c) => c.uniformDetails?.missing?.includes(item)).length;
                      return (
                        <td key={item} className="px-1.5 py-1.5 text-center font-black text-slate-800">
                          {count > 0 ? count : <span className="font-normal text-slate-300">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* PODPIS */}
      <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs text-slate-500">
        <span>Zpracoval: <strong>{inspection.inspector}</strong> · {formatDate(inspection.date)} · Depo: {inspection.depot}</span>
        <span className="flex flex-col items-center gap-1">
          <span className="inline-block w-44 border-b border-slate-400" />
          <span>Podpis kontrolující osoby</span>
        </span>
      </div>
    </div>
  );
}
