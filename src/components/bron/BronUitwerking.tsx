"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Source } from "@/lib/types";

const CHECKS: { key: string; label: string }[] = [
  { key: "auteur", label: "Auteur of organisatie is bekend en deskundig" },
  { key: "actueel", label: "De bron is actueel genoeg voor mijn onderwerp" },
  { key: "objectief", label: "De bron is objectief (geen reclame of eenzijdige mening)" },
  { key: "controleerbaar", label: "De informatie is elders te controleren" },
];

export default function BronUitwerking({ source }: { source: Source }) {
  const [summary, setSummary] = useState(source.summary ?? "");
  const [quotes, setQuotes] = useState(source.quotes ?? "");
  const [relevance, setRelevance] = useState(source.relevance ?? "");
  const [reliability, setReliability] = useState<Record<string, boolean>>(source.reliability ?? {});
  const [saved, setSaved] = useState<"idle" | "done">("idle");
  const supabase = createClient();

  async function save(patch: Partial<Source>) {
    await supabase.from("pws_sources").update(patch).eq("id", source.id);
    setSaved("done");
    setTimeout(() => setSaved("idle"), 1200);
  }

  function toggleCheck(key: string) {
    const next = { ...reliability, [key]: !reliability[key] };
    setReliability(next);
    save({ reliability: next });
  }

  const score = CHECKS.filter((c) => reliability[c.key]).length;

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Samenvatting</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => save({ summary: summary || null })}
          rows={3}
          placeholder="Wat staat er in deze bron, in je eigen woorden?"
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Belangrijke citaten</label>
        <textarea
          value={quotes}
          onChange={(e) => setQuotes(e.target.value)}
          onBlur={() => save({ quotes: quotes || null })}
          rows={2}
          placeholder="Letterlijke citaten die je misschien wilt gebruiken (met paginanummer)."
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoort bij welke deelvraag?</label>
        <input
          value={relevance}
          onChange={(e) => setRelevance(e.target.value)}
          onBlur={() => save({ relevance: relevance || null })}
          placeholder="Bijv. deelvraag 2 over blauw licht en slaap"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Betrouwbaarheid</label>
          <span className={`text-xs font-semibold ${score >= 3 ? "text-emerald-600" : score === 2 ? "text-amber-600" : "text-red-600"}`}>
            {score}/4
          </span>
        </div>
        <ul className="mt-1 space-y-1">
          {CHECKS.map((c) => (
            <li key={c.key}>
              <button onClick={() => toggleCheck(c.key)} className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left hover:bg-slate-50">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-white ${
                    reliability[c.key] ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
                  }`}
                >
                  {reliability[c.key] && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm ${reliability[c.key] ? "text-slate-700" : "text-slate-500"}`}>{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="h-3 text-xs text-emerald-600">{saved === "done" ? "Opgeslagen ✓" : ""}</div>
    </div>
  );
}
