import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { UploadCloud, Download, Trash2, Info, Settings, CheckCircle2 } from "lucide-react";

type FlightEntry = {
  date: string;
  total: number;
  pic: number;
  solo: number;
  dual: number;
  night: number;
  xc: number;
  ifr: number;
  approaches: number;
  landings: number;
  nightLandings: number;
};

const STORAGE_KEY = "ftl_log_entries_v1";

const parseNumber = (v: string): number => {
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  while (i < text.length) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      inQuotes = !inQuotes; i++; continue;
    }
    if (!inQuotes && (char === "," || char === "\n" || char === "\r")) {
      row.push(field); field = "";
      if (char === ",") { i++; continue; }
      if (char === "\r" && text[i + 1] === "\n") i++;
      rows.push(row); row = []; i++; continue;
    }
    field += char; i++;
  }
  row.push(field); rows.push(row);
  return rows.filter(r => r.some(c => c.trim() !== ""));
}

function toISO(d: string): string {
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return new Date().toISOString().slice(0, 10);
}

function loadEntries(): FlightEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
  } catch {}
  return [];
}

function saveEntries(entries: FlightEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const SAMPLE: FlightEntry[] = [
  { date: "2025-05-01", total: 1.2, pic: 0, solo: 0, dual: 1.2, night: 0, xc: 0, ifr: 0.3, approaches: 0, landings: 4, nightLandings: 0 },
  { date: "2025-05-08", total: 1.0, pic: 0, solo: 0, dual: 1.0, night: 0, xc: 0.4, ifr: 0.5, approaches: 2, landings: 3, nightLandings: 0 },
  { date: "2025-05-14", total: 1.4, pic: 0, solo: 0, dual: 1.4, night: 0, xc: 0.6, ifr: 0.2, approaches: 0, landings: 5, nightLandings: 0 },
  { date: "2025-06-02", total: 1.5, pic: 0.8, solo: 0.8, dual: 0.7, night: 0.5, xc: 0.5, ifr: 0.2, approaches: 0, landings: 3, nightLandings: 2 },
  { date: "2025-06-10", total: 1.7, pic: 0.9, solo: 0.9, dual: 0.8, night: 0, xc: 0.9, ifr: 0.3, approaches: 0, landings: 3, nightLandings: 0 },
  { date: "2025-07-01", total: 1.8, pic: 1.8, solo: 1.0, dual: 0.8, night: 0.8, xc: 0.6, ifr: 0.1, approaches: 0, landings: 4, nightLandings: 2 },
  { date: "2025-07-22", total: 1.3, pic: 1.3, solo: 0.5, dual: 0.8, night: 0, xc: 0.4, ifr: 0, approaches: 0, landings: 3, nightLandings: 0 },
  { date: "2025-08-03", total: 1.6, pic: 1.6, solo: 0.9, dual: 0.7, night: 0.2, xc: 0.5, ifr: 0.1, approaches: 0, landings: 3, nightLandings: 1 },
];

type Targets = {
  ppl: { total: number; dual: number; solo: number; xcDual: number; nightDual: number; instrument: number; soloXC: number; nightLandings: number };
  ir: { picXC: number; instrument: number; approaches: number };
  cpl: { total: number; pic: number; picXC: number; instrument: number };
};

const DEFAULT_TARGETS: Targets = {
  ppl: { total: 40, dual: 20, solo: 10, xcDual: 3, nightDual: 3, instrument: 3, soloXC: 5, nightLandings: 10 },
  ir: { picXC: 50, instrument: 40, approaches: 6 },
  cpl: { total: 250, pic: 100, picXC: 50, instrument: 10 },
};

function sum(entries: FlightEntry[], key: keyof FlightEntry): number {
  return entries.reduce((a, e) => a + (e[key] as number), 0);
}

function withinDays(entries: FlightEntry[], days: number, predicate: (e: FlightEntry) => number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entries.filter(e => new Date(e.date) >= cutoff).reduce((a, e) => a + predicate(e), 0);
}

function withinMonths(entries: FlightEntry[], months: number, predicate: (e: FlightEntry) => number): number {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return entries.filter(e => new Date(e.date) >= cutoff).reduce((a, e) => a + predicate(e), 0);
}

function pct(n: number, d: number) { return Math.max(0, Math.min(100, d > 0 ? (n / d) * 100 : 0)); }

export default function App() {
  const [entries, setEntries] = useState<FlightEntry[]>([]);
  const [targets, setTargets] = useState<Targets>(() => {
    try { const raw = localStorage.getItem("ftl_targets_v1"); return raw ? JSON.parse(raw) : DEFAULT_TARGETS; } catch { return DEFAULT_TARGETS; }
  });
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>(() => {
    try { const raw = localStorage.getItem("ftl_manual_checks_v1"); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });

  useEffect(() => {
    const stored = loadEntries();
    if (stored.length) setEntries(stored);
    else setEntries(SAMPLE);
  }, []);

  useEffect(() => saveEntries(entries), [entries]);
  useEffect(() => localStorage.setItem("ftl_targets_v1", JSON.stringify(targets)), [targets]);
  useEffect(() => localStorage.setItem("ftl_manual_checks_v1", JSON.stringify(manualChecks)), [manualChecks]);

  const totals = useMemo(() => ({
    total: sum(entries, "total"),
    pic: sum(entries, "pic"),
    solo: sum(entries, "solo"),
    dual: sum(entries, "dual"),
    night: sum(entries, "night"),
    xc: sum(entries, "xc"),
    ifr: sum(entries, "ifr"),
    approaches: sum(entries, "approaches"),
    landings: sum(entries, "landings"),
    nightLandings: sum(entries, "nightLandings"),
  }), [entries]);

  const dayLandings90 = withinDays(entries, 90, e => (e.landings || 0) - (e.nightLandings || 0));
  const nightLandings90 = withinDays(entries, 90, e => e.nightLandings || 0);
  const approaches6mo = withinMonths(entries, 6, e => e.approaches || 0);

  const cumulativeData = useMemo(() => {
    let running = 0;
    return [...entries].sort((a,b)=>a.date.localeCompare(b.date)).map(e => { running += e.total; return { date: e.date, hours: Number(running.toFixed(1)) }; });
  }, [entries]);

  const last30 = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const recent = entries.filter(e => new Date(e.date) >= cutoff);
    const agg: Record<string, number> = {
      Total: recent.reduce((a, e) => a + e.total, 0),
      PIC: recent.reduce((a, e) => a + e.pic, 0),
      Dual: recent.reduce((a, e) => a + e.dual, 0),
      Solo: recent.reduce((a, e) => a + e.solo, 0),
      Night: recent.reduce((a, e) => a + e.night, 0),
      XC: recent.reduce((a, e) => a + e.xc, 0),
      IFR: recent.reduce((a, e) => a + e.ifr, 0),
    };
    return Object.entries(agg).map(([k, v]) => ({ name: k, hours: Number(v.toFixed(1)) }));
  }, [entries]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const rows = parseCSV(text);
        const header = rows[0].map(h => h.trim().toLowerCase());
        const idx = {
          date: header.findIndex(h => ["date","flight date"].includes(h)),
          total: header.findIndex(h => ["total","total time","duration"].includes(h)),
          pic: header.findIndex(h => ["pic","pic time"].includes(h)),
          solo: header.findIndex(h => ["solo","solo time"].includes(h)),
          dual: header.findIndex(h => ["dual","dual received","dual time"].includes(h)),
          night: header.findIndex(h => ["night","night time"].includes(h)),
          xc: header.findIndex(h => ["xc","cross-country","cross country"].includes(h)),
          ifr: header.findIndex(h => ["ifr","instrument","simulated+actual instrument"].includes(h)),
          approaches: header.findIndex(h => ["approaches","instrument approaches"].includes(h)),
          landings: header.findIndex(h => ["landings","full-stop landings","full stop landings"].includes(h)),
          nightLandings: header.findIndex(h => ["night landings","night full-stop landings","night full stop landings"].includes(h)),
        } as Record<keyof FlightEntry, number>;

        const imported: FlightEntry[] = rows.slice(1).map(r => ({
  date: toISO(r[idx.date] || ""),
  total: parseNumber(r[idx.total] || "0"),
  pic: parseNumber(r[idx.pic] || "0"),
  solo: parseNumber(r[idx.solo] || "0"),
  dual: parseNumber(r[idx.dual] || "0"),
  night: parseNumber(r[idx.night] || "0"),
  xc: parseNumber(r[idx.xc] || "0"),
  ifr: parseNumber(r[idx.ifr] || "0"),
  approaches: parseNumber(r[idx.approaches] || "0"),
  landings: parseNumber(r[idx.landings] || "0"),
  nightLandings: parseNumber(r[idx.nightLandings] || "0"),
}));
        if (!imported.length) throw new Error("No rows parsed. Check your CSV headers.");
        setEntries(imported);
      } catch (err: any) {
        alert("Import failed: " + err?.message);
      }
    }
    reader.readAsText(file);
  }

  function addEntry(e: FlightEntry) { setEntries(prev => [...prev, e].sort((a,b)=>a.date.localeCompare(b.date))); }
  function clearAll() { if (confirm("Clear all saved flights?")) setEntries([]); }

  function downloadCSV() {
    const header = ["Date","Total","PIC","Solo","Dual","Night","XC","IFR","Approaches","Landings","NightLandings"];
    const lines = [header.join(","), ...entries.map(e => [e.date,e.total,e.pic,e.solo,e.dual,e.night,e.xc,e.ifr,e.approaches,e.landings,e.nightLandings].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "flightlog_export.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const checklistDefs = [
    { id: "ppl_solo_150nm", label: "PPL: Solo XC ≥150 NM total distance with 3 full-stop landings" },
    { id: "ppl_night_tol", label: "PPL: Completed 10 night full-stop landings" },
    { id: "ppl_checkride_prep", label: "PPL: 3 hrs checkride prep within 2 calendar months" },
    { id: "ir_ifr_cc", label: "IR: IFR XC ≥250 NM with 3 types of approaches" },
    { id: "ir_prep", label: "IR: 3 hrs checkride prep within 2 calendar months" },
    { id: "cpl_300nm", label: "CPL: 300 NM solo XC with landings at 3 pts (one ≥250 NM leg)" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Flight Training Logbook Companion</h1>
          <p className="text-neutral-600">Complement to MyFlightbook — import CSV, track milestones, and visualize progress. (Advisory only; verify FAA regs.)</p>
        </div>
        <div className="flex gap-2">
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline"><span className="inline-flex items-center gap-2"><svg className="w-4 h-4" /></span>How to import</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>Import from MyFlightbook</DialogTitle></DialogHeader>
                <div className="space-y-2 text-sm">
                  <p>Export your flights to CSV from MyFlightbook. This app tries to map common columns like:</p>
                  <ul className="list-disc pl-5">
                    <li><b>Date</b>, <b>Total</b>, <b>PIC</b>, <b>Solo</b>, <b>Dual</b>, <b>Night</b>, <b>XC</b>, <b>IFR</b>, <b>Approaches</b>, <b>Landings</b>, <b>Night Landings</b>.</li>
                  </ul>
                  <p>If some columns don’t exist in your export, they’ll import as 0. You can still edit by adding entries manually.</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Targets</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>Milestone Targets</DialogTitle></DialogHeader>
                <TargetsEditor targets={targets} onChange={setTargets} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">
        <Card className="shadow-sm">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
            <label className="flex items-center gap-2 border rounded-2xl px-3 py-2 cursor-pointer hover:bg-neutral-50">
              <span className="text-sm font-medium">Import CSV</span>
              <Input type="file" accept=".csv" onChange={onFile} className="hidden" />
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEntries(SAMPLE)}>Load sample</Button>
              <Button variant="secondary" onClick={downloadCSV}>Export CSV</Button>
              <Button variant="destructive" onClick={clearAll}>Clear</Button>
            </div>
            <AddEntryForm onAdd={addEntry} />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-4 gap-4">
          <SummaryCard title="Total Time" value={`${totals.total.toFixed(1)} h`} />
          <SummaryCard title="PIC" value={`${totals.pic.toFixed(1)} h`} />
          <SummaryCard title="XC" value={`${totals.xc.toFixed(1)} h`} />
          <SummaryCard title="Night" value={`${totals.night.toFixed(1)} h`} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Cumulative Hours</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="hours" name="Total" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Last 30 Days Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={last30}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold text-lg mb-4">Milestone Tracking</h3>
            <Tabs defaultValue="ppl" className="w-full">
              <TabsList>
                <TabsTrigger value="ppl">PPL</TabsTrigger>
                <TabsTrigger value="ir">Instrument</TabsTrigger>
                <TabsTrigger value="cpl">Commercial SEL</TabsTrigger>
                <TabsTrigger value="checks">Manual checks</TabsTrigger>
              </TabsList>
              <TabsContent value="ppl" className="space-y-3 mt-4">
                <MilestoneRow label="Total time" have={totals.total} need={targets.ppl.total} />
                <MilestoneRow label="Dual received" have={totals.dual} need={targets.ppl.dual} />
                <MilestoneRow label="Solo" have={totals.solo} need={targets.ppl.solo} />
                <MilestoneRow label="XC (dual)" have={totals.xc} need={targets.ppl.xcDual} hint="(Uses total XC; verify dual XC from log)" />
                <MilestoneRow label="Night (dual)" have={totals.night} need={targets.ppl.nightDual} hint="(Uses total night; verify dual night from log)" />
                <MilestoneRow label="Instrument (hood)" have={totals.ifr} need={targets.ppl.instrument} />
                <MilestoneRow label="Solo XC" have={totals.xc} need={targets.ppl.soloXC} hint="(Uses total XC; verify solo XC from log)" />
                <MilestoneRow label="Night full-stop landings" have={totals.nightLandings} need={targets.ppl.nightLandings} />
              </TabsContent>
              <TabsContent value="ir" className="space-y-3 mt-4">
                <MilestoneRow label="PIC cross-country" have={totals.xc} need={targets.ir.picXC} hint="Proxy: using total XC as PIC XC; verify in log" />
                <MilestoneRow label="Instrument time" have={totals.ifr} need={targets.ir.instrument} />
                <MilestoneRow label="Approaches (last 6 mo)" have={approaches6mo} need={targets.ir.approaches} hint="For currency; IR total may exceed 6 months" />
              </TabsContent>
              <TabsContent value="cpl" className="space-y-3 mt-4">
                <MilestoneRow label="Total time" have={totals.total} need={targets.cpl.total} />
                <MilestoneRow label="PIC" have={totals.pic} need={targets.cpl.pic} />
                <MilestoneRow label="PIC cross-country" have={totals.xc} need={targets.cpl.picXC} hint="Proxy: using total XC as PIC XC; verify in log" />
                <MilestoneRow label="Instrument time" have={totals.ifr} need={targets.cpl.instrument} />
              </TabsContent>
              <TabsContent value="checks" className="mt-4">
                <div className="grid md:grid-cols-2 gap-3">
                  {checklistDefs.map(item => (
                    <label key={item.id} className="flex items-start gap-2 p-3 border rounded-2xl">
                      <Checkbox checked={!!manualChecks[item.id]} onCheckedChange={(v) => setManualChecks(prev => ({ ...prev, [item.id]: Boolean(v) }))} />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold text-lg mb-4">Currency (Advisory)</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <CurrencyCard title="Passenger (day) 90-day" value={`${dayLandings90} landings`} ok={dayLandings90 >= 3} note="Proxy: assumes non-night landings are day" />
              <CurrencyCard title="Passenger (night) 90-day" value={`${nightLandings90} landings`} ok={nightLandings90 >= 3} note="Full-stop night landings" />
              <CurrencyCard title="IFR 6-month" value={`${approaches6mo} approaches`} ok={approaches6mo >= 6} note="Approaches only; remember holding & tracking" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 md:p-6">
            <h3 className="font-semibold text-lg mb-4">Recent Flights</h3>
            <div className="overflow-auto rounded-2xl border">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 text-neutral-700">
                  <tr>{"Date Total PIC Solo Dual Night XC IFR App Land NightL".split(" ").map(h => (<th key={h} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>))}</tr>
                </thead>
                <tbody>
                  {[...entries].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,25).map((e, i) => (
                    <tr key={i} className="odd:bg-white even:bg-neutral-50">
                      <td className="px-3 py-2 whitespace-nowrap">{e.date}</td>
                      <td className="px-3 py-2">{e.total.toFixed(1)}</td>
                      <td className="px-3 py-2">{e.pic.toFixed(1)}</td>
                      <td className="px-3 py-2">{e.solo.toFixed(1)}</td>
                      <td className="px-3 py-2">{e.dual.toFixed(1)}</td>
                      <td className="px-3 py-2">{e.night.toFixed(1)}</td>
                      <td className="px-3 py-2">{e.xc.toFixed(1)}</td>
                      <td className="px-3 py-2">{e.ifr.toFixed(1)}</td>
                      <td className="px-3 py-2">{e.approaches}</td>
                      <td className="px-3 py-2">{e.landings}</td>
                      <td className="px-3 py-2">{e.nightLandings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <footer className="text-xs text-neutral-500 pb-8">
          <p className="flex items-center gap-2">Always confirm totals and specific FAA/61 requirements with your CFI and official records. This tool is for planning/visualization only.</p>
        </footer>
      </main>
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="text-sm text-neutral-500">{title}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function MilestoneRow({ label, have, need, hint }: { label: string; have: number; need: number; hint?: string }) {
  const percentage = pct(have, need);
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-2">
      <div className="md:col-span-1 text-sm font-medium">{label}</div>
      <div className="md:col-span-3"><Progress value={percentage} className="h-3" /></div>
      <div className="md:col-span-1 text-right text-sm tabular-nums">{have.toFixed(1)} / {need} {hint && <span className="text-neutral-500"> — {hint}</span>}</div>
    </div>
  )
}

function CurrencyCard({ title, value, ok, note }: { title: string; value: string; ok: boolean; note?: string }) {
  return (
    <div className={`border rounded-2xl p-4 ${ok ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="text-sm font-medium flex items-center justify-between">
        <span>{title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-200' : 'bg-amber-200'}`}>{ok ? 'Current' : 'Not current'}</span>
      </div>
      <div className="text-xl font-semibold mt-2">{value}</div>
      {note && <div className="text-xs text-neutral-600 mt-1">{note}</div>}
    </div>
  )
}

function AddEntryForm({ onAdd }: { onAdd: (e: FlightEntry) => void }) {
  const [form, setForm] = useState<FlightEntry>({
    date: new Date().toISOString().slice(0,10),
    total: 1, pic: 0, solo: 0, dual: 1, night: 0, xc: 0, ifr: 0, approaches: 0, landings: 1, nightLandings: 0,
  });
  function upd<K extends keyof FlightEntry>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: k === 'date' ? v : parseNumber(v) } as FlightEntry));
  }
  return (
    <form onSubmit={(e)=>{e.preventDefault(); onAdd(form);}} className="flex flex-wrap items-end gap-2">
      <Input type="date" value={form.date} onChange={e=>upd('date', e.target.value)} className="w-36" />
      {[['total','Tot'],['pic','PIC'],['solo','Solo'],['dual','Dual'],['night','Night'],['xc','XC'],['ifr','IFR']].map(([k, label]) => (
        <LabeledNumber key={k} label={label} value={String((form as any)[k])} onChange={(v)=>upd(k as any, v)} />
      ))}
      <LabeledNumber label="App" value={String(form.approaches)} onChange={v=>upd('approaches', v)} />
      <LabeledNumber label="Land" value={String(form.landings)} onChange={v=>upd('landings', v)} />
      <LabeledNumber label="N-Land" value={String(form.nightLandings)} onChange={v=>upd('nightLandings', v)} />
      <Button type="submit">Add</Button>
    </form>
  )
}

function LabeledNumber({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col w-20">
      <label className="text-xs text-neutral-600 mb-1">{label}</label>
      <Input type="number" step="0.1" value={value} onChange={e=>onChange(e.target.value)} />
    </div>
  )
}

function TargetsEditor({ targets, onChange }: { targets: Targets; onChange: (t: Targets) => void }) {
  const [t, setT] = useState<Targets>(targets);
  useEffect(() => setT(targets), [targets]);
  function set<K1 extends keyof Targets, K2 extends keyof Targets[K1]>(k1: K1, k2: K2, v: number) {
    const next = { ...t, [k1]: { ...t[k1], [k2]: v } } as Targets;
    setT(next);
  }
  return (
    <div className="space-y-4">
      <section>
        <h4 className="font-semibold mb-2">PPL</h4>
        <div className="grid grid-cols-2 gap-2">
          <TargetInput label="Total" value={t.ppl.total} onChange={v=>set('ppl','total',v)} />
          <TargetInput label="Dual" value={t.ppl.dual} onChange={v=>set('ppl','dual',v)} />
          <TargetInput label="Solo" value={t.ppl.solo} onChange={v=>set('ppl','solo',v)} />
          <TargetInput label="XC (dual)" value={t.ppl.xcDual} onChange={v=>set('ppl','xcDual',v)} />
          <TargetInput label="Night (dual)" value={t.ppl.nightDual} onChange={v=>set('ppl','nightDual',v)} />
          <TargetInput label="Instrument" value={t.ppl.instrument} onChange={v=>set('ppl','instrument',v)} />
          <TargetInput label="Solo XC" value={t.ppl.soloXC} onChange={v=>set('ppl','soloXC',v)} />
          <TargetInput label="Night landings" value={t.ppl.nightLandings} onChange={v=>set('ppl','nightLandings',v)} />
        </div>
      </section>
      <section>
        <h4 className="font-semibold mb-2">Instrument Rating</h4>
        <div className="grid grid-cols-2 gap-2">
          <TargetInput label="PIC XC" value={t.ir.picXC} onChange={v=>set('ir','picXC',v)} />
          <TargetInput label="Instrument" value={t.ir.instrument} onChange={v=>set('ir','instrument',v)} />
          <TargetInput label="Approaches (6 mo)" value={t.ir.approaches} onChange={v=>set('ir','approaches',v)} />
        </div>
      </section>
      <section>
        <h4 className="font-semibold mb-2">Commercial SEL</h4>
        <div className="grid grid-cols-2 gap-2">
          <TargetInput label="Total" value={t.cpl.total} onChange={v=>set('cpl','total',v)} />
          <TargetInput label="PIC" value={t.cpl.pic} onChange={v=>set('cpl','pic',v)} />
          <TargetInput label="PIC XC" value={t.cpl.picXC} onChange={v=>set('cpl','picXC',v)} />
          <TargetInput label="Instrument" value={t.cpl.instrument} onChange={v=>set('cpl','instrument',v)} />
        </div>
      </section>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={()=>setT({ ppl: { total: 40, dual: 20, solo: 10, xcDual: 3, nightDual: 3, instrument: 3, soloXC: 5, nightLandings: 10 }, ir: { picXC: 50, instrument: 40, approaches: 6 }, cpl: { total: 250, pic: 100, picXC: 50, instrument: 10 } })}>Reset</Button>
        <Button onClick={()=>onChange(t)}>Save Targets</Button>
      </div>
    </div>
  )
}

function TargetInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 border rounded-2xl px-3 py-2">
      <span className="text-sm">{label}</span>
      <Input type="number" step="1" value={String(value)} onChange={e=>onChange(parseNumber(e.target.value))} className="w-28" />
    </label>
  )
}
