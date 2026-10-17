"use client";

import { useState } from "react";
import { WEET_NIET, andersWaarde, labelVan, labelsVoor, vraagNummers, type Reactie, type Vraag } from "@/lib/enquete";

/** Losse reacties bekijken: per reactie uitklappen om alle antwoorden te lezen. Alleen lezen. */
export default function ReactiesBeheer({ vragen, reacties }: { vragen: Vraag[]; reacties: Reactie[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const nummers = vraagNummers(vragen);

  function weergave(v: Vraag, waarde: string) {
    if (v.type === "schaal" || v.type === "stellingen") {
      if (waarde === WEET_NIET) return v.config.weetNietLabel || "Weet ik niet";
      const i = Number(waarde) - 1;
      return `${waarde} – ${labelsVoor(v)[i] ?? ""}`;
    }
    const a = andersWaarde(v);
    if (waarde.startsWith(`${a}: `)) return `${labelVan(v, a)} ${waarde.slice(a.length + 2)}`;
    return labelVan(v, waarde);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Losse reacties ({reacties.length})</h3>

      <ul className="mt-3 divide-y divide-slate-100">
        {reacties.map((r) => {
          const nr = reacties.indexOf(r) + 1;
          const uitgeklapt = open === r.id;
          return (
            <li key={r.id} className="py-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpen(uitgeklapt ? null : r.id)}
                  aria-expanded={uitgeklapt}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span aria-hidden className="text-slate-400">{uitgeklapt ? "▾" : "▸"}</span>
                  <span className="font-medium">Reactie {nr}</span>
                  <span className="truncate text-slate-500">· {datum(r.created_at)} · {r.answers.length} antwoorden</span>
                </button>
              </div>
              {uitgeklapt && (
                <dl className="mt-2 space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm">
                  {vragen.map((v, i) => {
                    const eigen = r.answers.filter((a) => a.q === v.id);
                    if (!eigen.length) return null;
                    const tekst =
                      v.type === "stellingen"
                        ? eigen
                            .slice()
                            .sort((a, b) => (a.i ?? 0) - (b.i ?? 0))
                            .map((a) => `${(v.config.kort ?? v.config.items ?? [])[a.i ?? 0] ?? ""}: ${weergave(v, a.v)}`)
                            .join(" · ")
                        : eigen.map((a) => weergave(v, a.v)).join(", ");
                    return (
                      <div key={v.id}>
                        <dt className="text-slate-500">{nummers[i]}. {v.text}</dt>
                        <dd className="text-slate-800">{tekst}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function datum(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
