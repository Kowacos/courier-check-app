import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, FileText, Plus, Trash2, Save, RotateCcw, Search, CheckCircle2, AlertTriangle, XCircle, Printer, Edit3 } from "lucide-react";
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

function createEmptyCourier() {
  return {
    id: crypto.randomUUID(),
    name: "",
    route: "",
    vehicle: "",
    checks: emptyChecks(),
    action: "Bez opatření",
    generalNote: "",
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

function statusLabel(value) {
  return STATUS_OPTIONS.find((item) => item.value === value)?.label || "V pořádku";
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

  return (
      <div className="min-h-screen bg-slate-100 text-slate-950 print:bg-white">
        <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .report-card { box-shadow: none !important; border: none !important; }
          @page { margin: 16mm; }
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
            </div>
          </div>
        </header>

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
            <PrintableReport inspection={inspection} summary={summary} />
          </section>
        </main>
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

function PrintableReport({ inspection, summary }) {
  const couriersWithIssues = inspection.couriers.filter((courier) => getCourierScore(courier) > 0 || courier.generalNote);

  return (
      <div className="space-y-6 bg-white text-slate-950 print:text-black">
        <div className="border-b border-slate-300 pb-4">
          <h1 className="text-3xl font-black tracking-tight">Report kontroly kurýrů</h1>
          <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
            <div><strong>Datum:</strong> {formatDate(inspection.date)}</div>
            <div><strong>Depo / hala:</strong> {inspection.depot}</div>
            <div><strong>Kontrolující osoba:</strong> {inspection.inspector}</div>
            <div><strong>Směna:</strong> {inspection.shift}</div>
          </div>
          {inspection.note && <p className="mt-3 text-sm"><strong>Poznámka:</strong> {inspection.note}</p>}
        </div>

        <section>
          <h2 className="mb-3 text-xl font-bold">Souhrn</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <ReportStat label="Kontrolováno" value={summary.total} />
            <ReportStat label="Vyhovělo" value={summary.ok} />
            <ReportStat label="S výhradou" value={summary.warning} />
            <ReportStat label="Nevyhovělo" value={summary.fail} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Nejčastější nedostatky</h2>
          {Object.keys(summary.issues).length === 0 ? (
              <p className="rounded-2xl border border-slate-200 p-3 text-sm">Nebyl zaznamenán žádný nedostatek.</p>
          ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(summary.issues).map(([name, count]) => (
                    <div key={name} className="flex justify-between rounded-2xl border border-slate-200 p-3 text-sm">
                      <span>{name}</span>
                      <strong>{count}×</strong>
                    </div>
                ))}
              </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Přehled kurýrů</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-300">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100">
              <tr>
                <th className="border-b border-slate-300 p-2">Kurýr</th>
                <th className="border-b border-slate-300 p-2">Trasa</th>
                <th className="border-b border-slate-300 p-2">Vozidlo</th>
                <th className="border-b border-slate-300 p-2">Výsledek</th>
                <th className="border-b border-slate-300 p-2">Opatření</th>
              </tr>
              </thead>
              <tbody>
              {inspection.couriers.map((courier) => {
                const result = getCourierResult(courier);
                return (
                    <tr key={courier.id}>
                      <td className="border-b border-slate-200 p-2 font-medium">{courier.name || "Bez jména"}</td>
                      <td className="border-b border-slate-200 p-2">{courier.route || "-"}</td>
                      <td className="border-b border-slate-200 p-2">{courier.vehicle || "-"}</td>
                      <td className="border-b border-slate-200 p-2">{result.label}</td>
                      <td className="border-b border-slate-200 p-2">{courier.action}</td>
                    </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Detail nedostatků</h2>
          {couriersWithIssues.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 p-3 text-sm">Všichni kontrolovaní kurýři byli bez výhrad.</p>
          ) : (
              <div className="space-y-4">
                {couriersWithIssues.map((courier) => {
                  const result = getCourierResult(courier);
                  return (
                      <div key={courier.id} className="break-inside-avoid rounded-2xl border border-slate-300 p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-lg font-bold">{courier.name || "Bez jména"}</h3>
                          <span className="text-sm font-semibold">{result.label} · {courier.action}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          {CHECKS.map((check) => {
                            const status = courier.checks?.[check.id]?.status || "ok";
                            const note = courier.checks?.[check.id]?.note || "";
                            if (status === "ok" && !note) return null;
                            return (
                                <div key={check.id} className="rounded-xl bg-slate-50 p-3">
                                  <strong>{check.title}:</strong> {statusLabel(status)}
                                  {note && <div className="mt-1 whitespace-pre-wrap text-slate-700">Poznámka: {note}</div>}
                                </div>
                            );
                          })}
                          {courier.generalNote && <div className="rounded-xl bg-slate-50 p-3"><strong>Obecná poznámka:</strong> {courier.generalNote}</div>}
                        </div>
                      </div>
                  );
                })}
              </div>
          )}
        </section>
      </div>
  );
}

function ReportStat({ label, value }) {
  return (
      <div className="rounded-2xl border border-slate-200 p-3 text-center">
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      </div>
  );
}
