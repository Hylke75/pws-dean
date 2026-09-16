"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toApa } from "@/lib/apa";
import BronUitwerking from "@/components/bron/BronUitwerking";
import type { Source, Phase } from "@/lib/types";

const TYPES: Source["source_type"][] = ["website", "boek", "artikel", "video", "interview", "overig"];
const TYPE_LABELS: Record<Source["source_type"], string> = {
  website: "Website",
  boek: "Boek",
  artikel: "Artikel",
  video: "Video",
  interview: "Interview",
  overig: "Overig",
};

export default function BronnenClient({ initial, phases }: { initial: Source[]; phases: Phase[] }) {
  const [items, setItems] = useState<Source[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    source_type: "website" as Source["source_type"],
    authors: "",
    title: "",
    year: "",
    publisher: "",
    url: "",
    accessed_on: "",
    phase_id: "",
    notes: "",
  });
  const supabase = createClient();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { data } = await supabase
      .from("pws_sources")
      .insert({
        source_type: form.source_type,
        authors: form.authors.trim() || null,
        title: form.title.trim(),
        year: form.year.trim() || null,
        publisher: form.publisher.trim() || null,
        url: form.url.trim() || null,
        accessed_on: form.accessed_on || null,
        phase_id: form.phase_id || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();
    if (data) {
      setItems((prev) => [...prev, data as Source]);
      setForm({ ...form, authors: "", title: "", year: "", publisher: "", url: "", accessed_on: "", notes: "" });
    }
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("pws_sources").delete().eq("id", id);
  }

  function copyAll() {
    const text = [...items]
      .sort((a, b) => (a.authors || a.title).localeCompare(b.authors || b.title))
      .map(toApa)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Lijst */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">{items.length} bron{items.length === 1 ? "" : "nen"}</p>
          {items.length > 0 && (
            <button onClick={copyAll} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              {copied ? "Gekopieerd ✓" : "Kopieer bronnenlijst (APA)"}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            Nog geen bronnen. Voeg je eerste bron toe →
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.id} className="group rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {TYPE_LABELS[s.source_type]}
                    </span>
                    <p className="mt-1.5 text-sm text-slate-800">{toApa(s)}</p>
                    {s.notes && <p className="mt-1 text-xs text-slate-500">{s.notes}</p>}
                  </div>
                  <button
                    onClick={() => remove(s.id)}
                    className="opacity-0 transition group-hover:opacity-100 text-slate-300 hover:text-red-500"
                    aria-label="Verwijderen"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => setExpanded((e) => (e === s.id ? null : s.id))}
                  className="mt-2 text-xs font-medium text-emerald-600 hover:underline"
                >
                  {expanded === s.id ? "Uitwerking verbergen ▲" : "Bron uitwerken ▼"}
                </button>
                {expanded === s.id && (
                  <BronUitwerking
                    source={s}
                    onUpdate={(patch) => setItems((prev) => prev.map((i) => (i.id === s.id ? { ...i, ...patch } : i)))}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulier */}
      <form onSubmit={add} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
        <p className="font-semibold text-slate-900">Bron toevoegen</p>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Soort</label>
          <select value={form.source_type} onChange={set("source_type")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
            {TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <Field label="Titel *"><input value={form.title} onChange={set("title")} placeholder="Titel van de bron" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" /></Field>
        <Field label="Auteur(s)"><input value={form.authors} onChange={set("authors")} placeholder="Achternaam, V." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" /></Field>
        <div className="flex gap-2">
          <Field label="Jaar"><input value={form.year} onChange={set("year")} placeholder="2026" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" /></Field>
          <Field label="Uitgever / site"><input value={form.publisher} onChange={set("publisher")} placeholder="NRC" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" /></Field>
        </div>
        <Field label="URL"><input value={form.url} onChange={set("url")} placeholder="https://…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" /></Field>
        <Field label="Geraadpleegd op"><input type="date" value={form.accessed_on} onChange={set("accessed_on")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" /></Field>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Bij fase (optioneel)</label>
          <select value={form.phase_id} onChange={set("phase_id")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500">
            <option value="">—</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.order_index}. {p.title}</option>
            ))}
          </select>
        </div>
        <Field label="Notitie"><input value={form.notes} onChange={set("notes")} placeholder="Waar gebruik je dit voor?" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" /></Field>
        <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
          Toevoegen
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}
