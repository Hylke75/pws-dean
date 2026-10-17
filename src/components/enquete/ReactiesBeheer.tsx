"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WEET_NIET, andersWaarde, labelVan, labelsVoor, vraagNummers, type Reactie, type Vraag } from "@/lib/enquete";
import BevestigKnop from "@/components/BevestigKnop";

/** Losse reacties bekijken en verwijderen, en in één keer alle reacties wissen. */
export default function ReactiesBeheer({
  surveyId,
  vragen,
  reacties,
  totaalAlle,
}: {
  surveyId: string;
  vragen: Vraag[];
  reacties: Reactie[];
  /** aantal reacties zonder filter, voor de knop 'alles wissen' */
  totaalAlle: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [weg, setWeg] = useState<Set<string>>(new Set());
  const [fout, setFout] = useState("");
  const nummers = vraagNummers(vragen);
  const zichtbaar = reacties.filter((r) => !weg.has(r.id));

  async function verwijder(r: Reactie) {
    setBezig(r.id);
    setFout("");
    const { error } = await supabase.from("pws_survey_responses").delete().eq("id", r.id);
    setBezig(null);
    if (error) {
      setFout("Verwijderen lukte niet. Probeer het opnieuw.");
      return;
    }
    setWeg((w) => new Set(w).add(r.id));
    router.refresh();
  }

  async function allesWissen() {
    setBezig("alles");
    setFout("");
    const { error } = await supabase.from("pws_survey_responses").delete().eq("survey_id", surveyId);
    setBezig(null);
    if (error) {
      setFout("Verwijderen lukte niet. Probeer het opnieuw.");
      return;
    }
    router.refresh();
  }

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Losse reacties ({zichtbaar.length})</h3>
        {totaalAlle > 0 && (
          <BevestigKnop
            vraag={`Alle ${totaalAlle} reacties definitief wissen?`}
            bevestig="Ja, alles wissen"
            onBevestig={allesWissen}
            disabled={bezig !== null}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Alle {totaalAlle} reacties wissen
          </BevestigKnop>
        )}
      </div>
      {fout && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}

      <ul className="mt-3 divide-y divide-slate-100">
        {zichtbaar.map((r) => {
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
                <BevestigKnop
                  vraag="Verwijderen?"
                  bevestig="Ja"
                  onBevestig={() => verwijder(r)}
                  disabled={bezig !== null}
                  ariaLabel={`Reactie ${nr} verwijderen`}
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  Verwijderen
                </BevestigKnop>
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
