"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VraagResultaat } from "@/components/enquete/EnqueteResultaten";
import Vergelijking, { TITELS, TOELICHTING } from "@/components/enquete/Vergelijking";
import { GROEP_KLEUREN, GroepLegenda } from "@/components/enquete/Grafieken";
import { splitsDeelvraag } from "@/lib/verslag";
import {
  figurenVoor,
  groepNaam as groep,
  type Antwoord,
  type OnderzoekEnquete,
  type OnderzoeksAntwoorden,
  type VraagRef,
} from "@/lib/onderzoek";
import type { Basis } from "@/lib/onderzoekOpslag";

const datum = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default function OnderzoekAntwoorden({
  hoofdvraag,
  deelvragen,
  enquetes,
  refs,
  interviews,
  documenten,
  zonderToestemming,
  resultaat,
  basis,
  gemaaktOp,
  aiAan,
}: {
  hoofdvraag: string;
  deelvragen: string[];
  enquetes: OnderzoekEnquete[];
  refs: VraagRef[];
  interviews: number;
  documenten: number;
  zonderToestemming: number;
  resultaat: OnderzoeksAntwoorden | null;
  basis: Basis | null;
  gemaaktOp: string | null;
  aiAan: boolean;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const nuReacties = enquetes.reduce((s, e) => s + e.reacties.length, 0);
  const toenReacties = basis?.enquetes.reduce((s, e) => s + e.reacties, 0) ?? 0;
  const verouderd = !!basis && (nuReacties !== toenReacties || interviews !== basis.interviews || documenten !== (basis.documenten ?? 0));

  // "[E1-V7]" of "[E1-V7, E2-V3]" leesbaar maken: "(enquête leerlingen en studenten, vraag 7)".
  const leesbaar = (t: string) =>
    t.replace(/\s*\[([^\]]*E\d+-V[^\]]*)\]/g, (_heel, inhoud: string) => {
      const delen = (inhoud.match(/E\d+-V[\w.]+/g) ?? []).flatMap((code) => {
        const r = refs.find((x) => x.code === code);
        const e = r && enquetes.find((x) => x.id === r.surveyId);
        return r && e ? [`enquête ${groep(e.title)}, vraag ${r.nummer}`] : [];
      });
      return delen.length ? ` (${delen.join("; ")})` : "";
    });

  async function analyseer() {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/onderzoek/antwoorden", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (data.ok) router.refresh();
      else
        setFout(
          data.reason === "no_key"
            ? "De AI staat nu niet aan."
            : data.reason === "geen_data"
              ? "Er is nog geen data om te analyseren."
              : "Dat lukte niet. Probeer het zo nog eens.",
        );
    } catch {
      setFout("Dat lukte niet. Controleer je internet en probeer het opnieuw.");
    }
    setBezig(false);
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Je data</p>
        <ul className="mt-1 text-sm text-slate-600">
          {enquetes.map((e) => (
            <li key={e.id}>
              Enquête {groep(e.title)}: <strong>{e.reacties.length}</strong> reacties
            </li>
          ))}
          <li>
            Interviews: <strong>{interviews}</strong> afgerond met toestemming voor AI-analyse
            {zonderToestemming > 0 && <span className="text-slate-400"> ({zonderToestemming} zonder toestemming, niet meegenomen)</span>}
          </li>
          <li>
            Aangeleverde analyses: <strong>{documenten}</strong>{" "}
            <Link href="/enquetes" className="text-emerald-700 hover:underline">
              (toevoegen bij Enquêtes)
            </Link>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {aiAan && (
            <button
              onClick={analyseer}
              disabled={bezig}
              className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
            >
              {bezig ? "Bezig met analyseren… (dit duurt 1 à 2 minuten)" : resultaat ? "✨ Opnieuw analyseren met de nieuwste data" : "✨ Beantwoord mijn onderzoeksvragen"}
            </button>
          )}
          {gemaaktOp && <span className="text-xs text-slate-500">Laatste analyse: {datum(gemaaktOp)}</span>}
        </div>
        {verouderd && !bezig && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Sinds de laatste analyse is er nieuwe data bijgekomen (toen {toenReacties} reacties, nu {nuReacties}; of er zijn interviews of analyses bij). Laat de analyse opnieuw maken.
          </p>
        )}
        {fout && <p className="mt-2 text-sm text-rose-600">{fout}</p>}
      </div>

      {resultaat ? (
        <>
          <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-800">
            De teksten zijn een eerste analyse door AI. Controleer ze met de grafieken en schrijf de antwoorden in je verslag in je eigen
            woorden. De grafieken en cijfers hieronder komen altijd direct uit je data.
          </p>

          <nav className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <p className="font-semibold text-slate-900">Inhoud</p>
            <ol className="mt-1 space-y-0.5">
              {deelvragen.map((d, i) => (
                <li key={i}>
                  <a href={`#dv-${i + 1}`} className="text-slate-700 hover:text-emerald-700 hover:underline">
                    Deelvraag {i + 1}: {splitsDeelvraag(d).vraag}
                  </a>
                </li>
              ))}
              <li>
                <a href="#hoofdvraag" className="font-medium text-slate-800 hover:text-emerald-700 hover:underline">
                  Hoofdvraag: {hoofdvraag}
                </a>
              </li>
            </ol>
          </nav>

          {resultaat.algemeen && <p className="text-sm text-slate-600">{resultaat.algemeen}</p>}

          {resultaat.deelvragen.map((a, i) => (
            <AntwoordBlok
              key={i}
              id={`dv-${i + 1}`}
              kop={`Deelvraag ${i + 1}`}
              vraag={deelvragen[i] ? splitsDeelvraag(deelvragen[i]).vraag : ""}
              a={a}
              leesbaar={leesbaar}
              enquetes={enquetes}
            />
          ))}
          <AntwoordBlok id="hoofdvraag" kop="Hoofdvraag" vraag={hoofdvraag} a={resultaat.hoofdvraag} leesbaar={leesbaar} enquetes={enquetes} hoofd />
        </>
      ) : (
        !bezig && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Er is nog geen analyse gemaakt. Klik op de knop hierboven.
          </p>
        )
      )}
    </div>
  );
}

function AntwoordBlok({
  id,
  kop,
  vraag,
  a,
  leesbaar,
  enquetes,
  hoofd = false,
}: {
  id: string;
  kop: string;
  vraag: string;
  a: Antwoord;
  leesbaar: (t: string) => string;
  enquetes: OnderzoekEnquete[];
  hoofd?: boolean;
}) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const figuren = figurenVoor(a.grafieken, enquetes);
  const tekst = [leesbaar(a.antwoord), ...a.onderbouwing.map((o) => `- ${leesbaar(o)}`), a.bronnen].filter(Boolean).join("\n");

  return (
    <section id={id} className={`scroll-mt-24 rounded-2xl border bg-white p-5 ${hoofd ? "border-emerald-300" : "border-slate-200"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{kop}</p>
      <h2 className="text-lg font-bold text-slate-900">{vraag}</h2>

      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{leesbaar(a.antwoord) || "Geen antwoord."}</p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(tekst);
            setGekopieerd(true);
            setTimeout(() => setGekopieerd(false), 1500);
          }}
          className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
        >
          {gekopieerd ? "Gekopieerd ✓" : "Kopieer"}
        </button>
      </div>

      {a.onderbouwing.length > 0 && (
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          {a.onderbouwing.map((o, i) => (
            <li key={i}>{leesbaar(o)}</li>
          ))}
        </ul>
      )}

      {a.interviews && (
        <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <span className="font-semibold">Uit de interviews: </span>
          {leesbaar(a.interviews)}
        </div>
      )}

      {a.bronnen && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span className="font-semibold">Uit je bronnen: </span>
          {a.bronnen}
        </div>
      )}

      {a.beperkingen && (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-semibold">Let op: </span>
          {leesbaar(a.beperkingen)}
        </div>
      )}

      {figuren.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {figuren.map((f) => {
            if (f.soort === "vergelijk") {
              const per = f.per.map(({ enquete, vraag }) => {
                const e = enquetes[enquete];
                return { g: { naam: groep(e.title), kleur: GROEP_KLEUREN[enquete % GROEP_KLEUREN.length], n: e.reacties.length, reacties: e.reacties }, v: vraag };
              });
              return (
                <figure key={f.code} className="rounded-xl border border-slate-200 p-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Vergelijking tussen de doelgroepen</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{TITELS[f.sleutel] ?? f.per[0].vraag.text}</p>
                  {f.waarom && <p className="mt-0.5 text-xs text-slate-500">{f.waarom}</p>}
                  {TOELICHTING[f.sleutel] && <p className="mt-0.5 text-xs italic text-slate-500">{TOELICHTING[f.sleutel]}</p>}
                  <div className="mt-2">
                    <GroepLegenda groepen={per.map(({ g }) => g)} />
                  </div>
                  <div className="mt-3">
                    <Vergelijking per={per} />
                  </div>
                </figure>
              );
            }
            const e = enquetes[f.enquete];
            return (
              <figure key={f.code} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Enquête {groep(e.title)} · vraag {f.nummer}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{f.vraag.text}</p>
                {f.waarom && <p className="mt-0.5 text-xs text-slate-500">{f.waarom}</p>}
                <div className="mt-3">
                  <VraagResultaat vraag={f.vraag} reacties={e.reacties} />
                </div>
              </figure>
            );
          })}
        </div>
      )}
    </section>
  );
}
