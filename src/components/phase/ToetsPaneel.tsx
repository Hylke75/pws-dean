"use client";

import { useState } from "react";
import type { AiFeedbackData, AiVerdict } from "@/lib/types";

const VERDICT: Record<AiVerdict, { label: string; cls: string; emoji: string }> = {
  klaar: { label: "Ziet er goed uit", cls: "bg-emerald-100 text-emerald-700", emoji: "✅" },
  bijna: { label: "Bijna klaar", cls: "bg-amber-100 text-amber-700", emoji: "🟡" },
  nog_niet: { label: "Nog niet klaar", cls: "bg-red-100 text-red-700", emoji: "🔴" },
};

export default function ToetsPaneel({
  phaseId,
  initial,
  initialAt,
}: {
  phaseId: string;
  initial: AiFeedbackData | null;
  initialAt: string | null;
}) {
  const [data, setData] = useState<AiFeedbackData | null>(initial);
  const [at, setAt] = useState<string | null>(initialAt);
  const [state, setState] = useState<"idle" | "loading" | "no_key" | "error">("idle");

  async function toets() {
    setState("loading");
    try {
      const res = await fetch(`/api/fase/${phaseId}/toets`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setData(json.data as AiFeedbackData);
        setAt(new Date().toISOString());
        setState("idle");
      } else if (json.reason === "no_key") {
        setState("no_key");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  const v = data ? VERDICT[data.verdict] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={toets}
          disabled={state === "loading"}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {state === "loading" ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Aan het toetsen…
            </>
          ) : (
            <>✨ {data ? "Opnieuw toetsen" : "Toets mijn werk met AI"}</>
          )}
        </button>
        {at && <span className="text-xs text-slate-400">Laatst getoetst: {new Date(at).toLocaleString("nl-NL")}</span>}
      </div>

      {state === "no_key" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          De AI-toets is nog niet geactiveerd (er staat nog geen sleutel ingesteld).
        </p>
      )}
      {state === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Er ging iets mis bij het toetsen. Probeer het zo nog eens.
        </p>
      )}

      {data && v && (
        <div className="mt-4 space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.cls}`}>
              {v.emoji} {v.label}
            </span>
          </div>
          <p className="text-sm text-slate-700">{data.samenvatting}</p>

          {data.sterke_punten.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Sterke punten</p>
              <ul className="space-y-1">
                {data.sterke_punten.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-emerald-500">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.aandachtspunten.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Aandachtspunten</p>
              <ul className="space-y-1">
                {data.aandachtspunten.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-amber-500">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Volgende stap</p>
            <p className="mt-1 text-sm text-slate-800">{data.volgende_stap}</p>
          </div>

          <p className="text-[11px] text-slate-400">AI-feedback is een hulpmiddel — je begeleider blijft leidend.</p>
        </div>
      )}
    </div>
  );
}
