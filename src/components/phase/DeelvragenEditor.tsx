"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Subquestion } from "@/lib/types";

export default function DeelvragenEditor({ initial }: { initial: Subquestion[] }) {
  const [items, setItems] = useState<Subquestion[]>(initial);
  const [saved, setSaved] = useState<"idle" | "done" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  function flashSaved() {
    setSaved("done");
    setTimeout(() => setSaved("idle"), 1500);
  }

  async function addDeelvraag() {
    setBusy(true);
    const order = items.length ? Math.max(...items.map((i) => i.order_index)) + 1 : 1;
    const { data, error } = await supabase
      .from("pws_subquestions")
      .insert({ text: "", order_index: order })
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      setSaved("error");
      return;
    }
    setItems((prev) => [...prev, data as Subquestion]);
  }

  async function saveText(id: string, text: string) {
    const { error } = await supabase.from("pws_subquestions").update({ text }).eq("id", id);
    if (error) {
      setSaved("error");
      return;
    }
    flashSaved();
  }

  async function remove(id: string) {
    if (!confirm("Deze deelvraag verwijderen? Bronnen die eraan gekoppeld zijn, verliezen die koppeling.")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("pws_subquestions").delete().eq("id", id);
    flashSaved();
  }

  function change(id: string, text: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
          Nog geen deelvragen. Voeg je eerste deelvraag toe — daarna kun je bronnen eraan koppelen.
        </p>
      )}

      {items.map((sq, i) => (
        <div key={sq.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Deelvraag {i + 1}
            </span>
            <button
              onClick={() => remove(sq.id)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              aria-label={`Deelvraag ${i + 1} verwijderen`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <textarea
            value={sq.text}
            onChange={(e) => change(sq.id, e.target.value)}
            onBlur={(e) => saveText(sq.id, e.target.value)}
            rows={3}
            placeholder="Beschrijf deze deelvraag. Eventuele subvragen mag je eronder zetten."
            className="w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          onClick={addDeelvraag}
          disabled={busy}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          + Deelvraag toevoegen
        </button>
        <span aria-live="polite" className={`text-xs ${saved === "error" ? "text-red-600" : "text-slate-500"}`}>
          {saved === "done" ? "Opgeslagen ✓" : saved === "error" ? "Opslaan mislukt" : "Wordt automatisch opgeslagen"}
        </span>
      </div>
    </div>
  );
}
