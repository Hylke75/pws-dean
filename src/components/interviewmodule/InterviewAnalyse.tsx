"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BevestigKnop from "@/components/BevestigKnop";
import {
  ZONDER_THEMA,
  vergelijkPerThema,
  weergave,
  type AiAnalyse,
  type AiBron,
  type AiPunt,
  type IvAntwoord,
  type IvThema,
  type IvUitnodiging,
} from "@/lib/interview";

export type OpgeslagenAnalyse = {
  id: string;
  thema: string | null;
  uitnodiging_ids: string[];
  resultaat: { analyse: AiAnalyse; pseudoniemen: Record<string, string>; verwijderd: number };
  model: string | null;
  beoordeeld: boolean;
  created_at: string;
};

const tijd = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

export default function InterviewAnalyse({
  uitnodigingen,
  antwoorden,
  themas,
  nummers,
  aiAan,
  analyses,
}: {
  uitnodigingen: IvUitnodiging[];
  antwoorden: IvAntwoord[];
  themas: IvThema[];
  nummers: Record<string, number>;
  aiAan: boolean;
  analyses: OpgeslagenAnalyse[];
}) {
  const groepen = [...themas.map((t) => ({ key: t.key, naam: t.naam, beschrijving: t.beschrijving })), { key: ZONDER_THEMA, naam: "Overige vragen", beschrijving: null }];
  const [thema, setThema] = useState(groepen[0]?.key ?? ZONDER_THEMA);
  const [gekozen, setGekozen] = useState<Set<string>>(new Set(uitnodigingen.map((u) => u.id)));

  const perId = useMemo(() => new Map(uitnodigingen.map((u) => [u.id, u])), [uitnodigingen]);
  const label = (u: IvUitnodiging) => weergave(u, nummers[u.id] ?? 0, false);
  const actief = uitnodigingen.filter((u) => gekozen.has(u.id));
  const rijen = vergelijkPerThema(actief, antwoorden, thema);
  const huidig = groepen.find((g) => g.key === thema);

  if (!uitnodigingen.length) {
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Er zijn nog geen ingevulde interviews. Zodra respondenten antwoorden geven, kun je ze hier per thema vergelijken.
      </p>
    );
  }

  const wissel = (id: string) =>
    setGekozen((g) => {
      const n = new Set(g);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="mt-6 space-y-4">
      <nav aria-label="Thema's" className="-mx-1 overflow-x-auto">
        <div className="inline-flex gap-1 p-1">
          {groepen.map((g) => (
            <button
              key={g.key}
              onClick={() => setThema(g.key)}
              aria-pressed={g.key === thema}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm transition ${
                g.key === thema ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {g.naam}
            </button>
          ))}
        </div>
      </nav>
      {huidig?.beschrijving && <p className="text-sm text-slate-600">{huidig.beschrijving}</p>}

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          Respondenten ({gekozen.size} van {uitnodigingen.length} gekozen)
        </summary>
        <div className="mt-2 flex gap-3 text-sm">
          <button onClick={() => setGekozen(new Set(uitnodigingen.map((u) => u.id)))} className="text-emerald-700 hover:underline">Alles</button>
          <button onClick={() => setGekozen(new Set(uitnodigingen.filter((u) => u.status === "afgerond").map((u) => u.id)))} className="text-emerald-700 hover:underline">Alleen afgerond</button>
          <button onClick={() => setGekozen(new Set())} className="text-emerald-700 hover:underline">Niets</button>
        </div>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {uitnodigingen.map((u) => (
            <li key={u.id}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={gekozen.has(u.id)} onChange={() => wissel(u.id)} className="h-4 w-4 accent-emerald-600" />
                <span className="min-w-0 truncate">
                  {label(u).label}
                  <span className="text-slate-500"> · {u.type_naam}{u.status !== "afgerond" ? " · nog bezig" : ""}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </details>

      {rijen.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Geen vragen binnen dit thema bij de gekozen respondenten.
        </p>
      ) : (
        rijen.map((r) => (
          <section key={r.key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-900">{r.tekst}</h2>
            <p className="text-xs text-slate-400">{r.key.startsWith("alg_") ? "Algemene vraag" : "Vraag voor één interviewtype"} · {r.key}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {r.antwoorden.map((a) => {
                const u = perId.get(a.uitnodiging_id)!;
                const w = label(u);
                return (
                  <article key={a.uitnodiging_id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-800">
                      {w.label}
                      {w.naam && <span className="font-normal text-slate-500"> · {u.type_naam}</span>}
                    </p>
                    {(w.functie || w.organisatie) && <p className="text-xs text-slate-500">{[w.functie, w.organisatie].filter(Boolean).join(", ")}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {u.taal === "en" && <span className="rounded bg-sky-50 px-1.5 text-xs text-sky-700">in het Engels</span>}
                      {!w.magCiteren && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">niet letterlijk citeren</span>}
                      {!w.naamToegestaan && <span className="rounded bg-amber-50 px-1.5 text-xs text-amber-700">naam niet noemen</span>}
                    </div>
                    {a.antwoord ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{a.antwoord}</p>
                    ) : (
                      <p className="mt-2 text-sm italic text-slate-400">(niet beantwoord)</p>
                    )}
                    {a.tekst !== r.tekst && <p className="mt-2 text-xs text-slate-400">Vraag in deze vorm gesteld: {a.tekst}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      {thema !== ZONDER_THEMA && (
        <AiDeel
          thema={thema}
          themaNaam={huidig?.naam ?? ""}
          aiAan={aiAan}
          gekozen={actief}
          analyses={analyses.filter((a) => a.thema === thema)}
          perId={perId}
          label={(id) => {
            const u = perId.get(id);
            return u ? label(u).label : "Respondent (niet meer beschikbaar)";
          }}
        />
      )}
    </div>
  );
}

function AiDeel({
  thema,
  themaNaam,
  aiAan,
  gekozen,
  analyses,
  perId,
  label,
}: {
  thema: string;
  themaNaam: string;
  aiAan: boolean;
  gekozen: IvUitnodiging[];
  analyses: OpgeslagenAnalyse[];
  perId: Map<string, IvUitnodiging>;
  label: (id: string) => string;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const metToestemming = gekozen.filter((u) => u.toestemming?.ai);

  async function maak() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch("/api/interviews/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thema, ids: metToestemming.map((u) => u.id) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setFout(data.error ?? "De analyse is mislukt.");
      else router.refresh();
    } catch {
      setFout("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
      <h2 className="font-semibold text-slate-900">AI-hulp bij het thema ‘{themaNaam}’</h2>
      {!aiAan ? (
        <p className="mt-1 text-sm text-slate-600">
          De AI-analyse staat uit. Je kunt hem aanzetten bij <Link href="/interviews/instellingen" className="text-emerald-700 underline">Privacy en instellingen</Link>.
          De vergelijking hierboven werkt ook zonder AI.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">
            Claude maakt een eerste samenvatting, met de terugkerende onderwerpen, overeenkomsten, verschillen en mogelijke citaten.
            Alleen antwoorden van respondenten die toestemming gaven voor AI-verwerking worden gebruikt, zonder naam of organisatie.
            Elk punt verwijst naar een antwoord; citaten die niet letterlijk in een antwoord staan, worden automatisch weggelaten.
            Het resultaat is een concept: controleer het altijd zelf aan de hand van de antwoorden hierboven.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={maak}
              disabled={bezig || !metToestemming.length}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {bezig ? "Bezig met analyseren…" : "Maak een AI-analyse"}
            </button>
            <span className="text-sm text-slate-500">
              {metToestemming.length} van {gekozen.length} gekozen respondenten gaven toestemming voor AI.
            </span>
          </div>
          {fout && <p role="alert" className="mt-2 text-sm text-red-600">{fout}</p>}
        </>
      )}

      {analyses.length > 0 && (
        <div className="mt-4 space-y-3">
          {analyses.map((a) => (
            <AnalyseKaart key={a.id} a={a} perId={perId} label={label} />
          ))}
        </div>
      )}
    </section>
  );
}

function AnalyseKaart({ a, perId, label }: { a: OpgeslagenAnalyse; perId: Map<string, IvUitnodiging>; label: (id: string) => string }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(!a.beoordeeld);
  const { analyse, pseudoniemen, verwijderd } = a.resultaat;

  const bronTekst = (b: AiBron) => {
    const id = pseudoniemen[b.respondent];
    const u = id ? perId.get(id) : undefined;
    const nr = u ? u.vragen.findIndex((v) => v.key === b.vraag_key) + 1 : 0;
    return `${id ? label(id) : b.respondent}${nr ? `, vraag ${nr}` : ""}`;
  };
  const punten = (titel: string, lijst: AiPunt[]) =>
    lijst.length ? (
      <div>
        <h4 className="text-sm font-semibold text-slate-800">{titel}</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {lijst.map((p, i) => (
            <li key={i}>
              {p.tekst} <span className="text-xs text-slate-500">({p.bronnen.map(bronTekst).join("; ")})</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  async function zetBeoordeeld(waarde: boolean) {
    await supabase.from("pws_iv_analyses").update({ beoordeeld: waarde }).eq("id", a.id);
    router.refresh();
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setOpen(!open)} className="text-left text-sm font-semibold text-slate-900 hover:underline">
          {open ? "▾" : "▸"} Analyse van {tijd(a.created_at)} · {a.uitnodiging_ids.length} respondent(en)
        </button>
        {a.beoordeeld ? (
          <span className="rounded bg-emerald-100 px-1.5 text-xs text-emerald-700">door Dean gecontroleerd</span>
        ) : (
          <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">Concept – door Dean te controleren</span>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{analyse.samenvatting}</p>
          {punten("Terugkerende onderwerpen", analyse.themas)}
          {punten("Overeenkomsten", analyse.overeenkomsten)}
          {punten("Verschillen", analyse.verschillen)}
          {analyse.citaten.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Mogelijke citaten (letterlijk gecontroleerd)</h4>
              <ul className="mt-1 space-y-2">
                {analyse.citaten.map((c, i) => (
                  <li key={i} className="border-l-2 border-violet-300 pl-3 text-sm">
                    <span className="italic text-slate-700">‘{c.citaat}’</span>
                    <span className="block text-xs text-slate-500">{bronTekst(c)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analyse.vervolgvragen.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Mogelijke vervolgvragen</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {analyse.vervolgvragen.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </div>
          )}
          {verwijderd > 0 && (
            <p className="text-xs text-slate-500">{verwijderd} punt(en) of citaat/citaten van de AI zijn weggelaten omdat ze niet aantoonbaar in de antwoorden stonden.</p>
          )}
          <p className="text-xs text-slate-400">Gemaakt met {a.model ?? "Claude"}. Gebruik dit als hulpmiddel; de conclusies in je profielwerkstuk trek je zelf.</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={a.beoordeeld} onChange={(e) => zetBeoordeeld(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
              Ik heb deze analyse gecontroleerd
            </label>
            <BevestigKnop
              vraag="Deze AI-analyse verwijderen? De interviews zelf blijven bewaard."
              onBevestig={async () => {
                await supabase.from("pws_iv_analyses").delete().eq("id", a.id);
                router.refresh();
              }}
              className="text-red-600 hover:underline"
            >
              Analyse verwijderen
            </BevestigKnop>
          </div>
        </div>
      )}
    </article>
  );
}
