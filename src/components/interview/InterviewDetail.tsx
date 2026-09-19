"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Interview, InterviewItem } from "@/lib/types";

export default function InterviewDetail({
  interview,
  initialItems,
  phases,
}: {
  interview: Interview;
  initialItems: InterviewItem[];
  phases: { id: string; order_index: number; title: string }[];
}) {
  const supabase = createClient();
  const [meta, setMeta] = useState({
    respondent: interview.respondent ?? "",
    rol: interview.rol ?? "",
    datum: interview.datum ?? "",
    phase_id: interview.phase_id ?? "",
  });
  const [items, setItems] = useState<InterviewItem[]>(initialItems);

  async function saveMeta(patch: Partial<typeof meta>) {
    const next = { ...meta, ...patch };
    setMeta(next);
    await supabase
      .from("pws_interviews")
      .update({
        respondent: next.respondent.trim() || null,
        rol: next.rol.trim() || null,
        datum: next.datum || null,
        phase_id: next.phase_id || null,
      })
      .eq("id", interview.id);
  }

  async function addItem() {
    const { data } = await supabase
      .from("pws_interview_items")
      .insert({ interview_id: interview.id, vraag: "", antwoord: "", order_index: items.length })
      .select()
      .single();
    if (data) setItems((it) => [...it, data as InterviewItem]);
  }
  function patchLocal(id: string, patch: Partial<InterviewItem>) {
    setItems((it) => it.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  async function saveItem(id: string, patch: Partial<InterviewItem>) {
    await supabase.from("pws_interview_items").update(patch).eq("id", id);
  }
  async function removeItem(id: string) {
    if (!confirm("Deze vraag verwijderen?")) return;
    setItems((it) => it.filter((x) => x.id !== id));
    await supabase.from("pws_interview_items").delete().eq("id", id);
  }

  return (
    <div>
      <input
        value={meta.respondent}
        onChange={(e) => setMeta((m) => ({ ...m, respondent: e.target.value }))}
        onBlur={() => saveMeta({})}
        placeholder="Wie heb je geïnterviewd?"
        className="w-full rounded-lg border border-transparent bg-transparent text-2xl font-bold text-slate-900 outline-none hover:border-slate-200 focus:border-emerald-500"
      />

      <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Rol / functie</label>
          <input value={meta.rol} onChange={(e) => setMeta((m) => ({ ...m, rol: e.target.value }))} onBlur={() => saveMeta({})} placeholder="Bijv. huisarts" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Datum</label>
          <input type="date" value={meta.datum} onChange={(e) => saveMeta({ datum: e.target.value })} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Bij fase</label>
          <select value={meta.phase_id} onChange={(e) => saveMeta({ phase_id: e.target.value })} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500">
            <option value="">—</option>
            {phases.map((p) => <option key={p.id} value={p.id}>{p.order_index}. {p.title}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((it, i) => (
          <div key={it.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-2">
              <span className="mt-2 text-sm font-semibold text-slate-500">{i + 1}.</span>
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  value={it.vraag ?? ""}
                  onChange={(e) => patchLocal(it.id, { vraag: e.target.value })}
                  onBlur={() => saveItem(it.id, { vraag: it.vraag })}
                  placeholder="Vraag…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500"
                />
                <textarea
                  value={it.antwoord ?? ""}
                  onChange={(e) => patchLocal(it.id, { antwoord: e.target.value })}
                  onBlur={() => saveItem(it.id, { antwoord: it.antwoord })}
                  rows={3}
                  placeholder="Antwoord / samenvatting…"
                  className="w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <button onClick={() => removeItem(it.id)} className="mt-0.5 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label="Verwijderen">✕</button>
            </div>
          </div>
        ))}
        <button onClick={addItem} className="w-full rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-600">
          + Vraag & antwoord toevoegen
        </button>
      </div>
    </div>
  );
}
