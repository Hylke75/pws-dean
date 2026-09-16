"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";
import type { LogEntry, Phase } from "@/lib/types";

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function timeToMin(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function fmtTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

export default function LogboekClient({ initial, phases }: { initial: LogEntry[]; phases: Phase[] }) {
  const [items, setItems] = useState<LogEntry[]>(initial);
  const [date, setDate] = useState(todayIso());
  const [begin, setBegin] = useState("");
  const [eind, setEind] = useState("");
  const [activity, setActivity] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const totalMinutes = useMemo(() => items.reduce((s, i) => s + i.minutes, 0), [items]);
  const totalHours = totalMinutes / 60;
  const phaseName = (id: string | null) => phases.find((p) => p.id === id)?.title;

  // Duur uit start/eind, anders handmatig
  const bMin = timeToMin(begin);
  const eMin = timeToMin(eind);
  const uitTijd = bMin != null && eMin != null && eMin > bMin ? eMin - bMin : null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const handmatig = (parseInt(hours || "0", 10) || 0) * 60 + (parseInt(minutes || "0", 10) || 0);
    const mins = uitTijd ?? handmatig;
    if (!activity.trim() || mins <= 0) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("pws_logboek")
      .insert({
        log_date: date,
        begin_tijd: uitTijd ? begin : null,
        eind_tijd: uitTijd ? eind : null,
        activity: activity.trim(),
        minutes: mins,
        next_step: nextStep.trim() || null,
        phase_id: phaseId || null,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (data) {
      setItems((prev) => [data as LogEntry, ...prev].sort((a, b) => (a.log_date < b.log_date ? 1 : -1)));
      setActivity("");
      setBegin("");
      setEind("");
      setHours("");
      setMinutes("");
      setNextStep("");
    }
    setSaving(false);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("pws_logboek").delete().eq("id", id);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Lijst */}
      <div>
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-slate-500">Totaal gelogd</p>
            <p className="text-sm font-medium text-slate-500">{totalHours.toFixed(1)} / 80 uur</p>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (totalHours / 80) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {totalHours >= 80 ? "Je hebt de 80-uur eis gehaald 🎉" : `Nog ${(80 - totalHours).toFixed(1)} uur te gaan.`}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            Nog geen logboekregels. Voeg je eerste werkmoment toe →
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="group rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">{fmtDate(it.log_date)}</span>
                      {it.begin_tijd && it.eind_tijd && (
                        <span className="text-xs text-slate-400">{fmtTime(it.begin_tijd)}–{fmtTime(it.eind_tijd)}</span>
                      )}
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                        {Math.floor(it.minutes / 60)}u {it.minutes % 60}m
                      </span>
                      {it.phase_id && phaseName(it.phase_id) && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {phaseName(it.phase_id)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-slate-800">{it.activity}</p>
                    {it.next_step && <p className="mt-1 text-xs text-slate-500">Volgende stap: {it.next_step}</p>}
                  </div>
                  <button
                    onClick={() => remove(it.id)}
                    className="opacity-0 transition group-hover:opacity-100 text-slate-300 hover:text-red-500"
                    aria-label="Verwijderen"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulier */}
      <form onSubmit={add} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
        <p className="font-semibold text-slate-900">Werkmoment toevoegen</p>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Datum</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Van</label>
            <input type="time" value={begin} onChange={(e) => setBegin(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Tot</label>
            <input type="time" value={eind} onChange={(e) => setEind(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </div>
        </div>
        {uitTijd != null ? (
          <p className="text-xs text-emerald-600">Duur: {Math.floor(uitTijd / 60)}u {uitTijd % 60}m</p>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Of vul de duur handmatig in</label>
            <div className="flex gap-2">
              <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="uren" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="min" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </div>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Wat heb je gedaan?</label>
          <textarea value={activity} onChange={(e) => setActivity(e.target.value)} rows={2} placeholder="bijv. bronnen gezocht over…" className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Fase (optioneel)</label>
          <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
            <option value="">—</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.order_index}. {p.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Volgende stap (optioneel)</label>
          <input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Wat ga je hierna doen?" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {saving ? "Opslaan…" : "Toevoegen"}
        </button>
      </form>
    </div>
  );
}
