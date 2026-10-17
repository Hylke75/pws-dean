import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  alleOpties,
  labelsVoor,
  openAntwoorden,
  pct,
  schaalVerdeling,
  telKeuzes,
  type Reactie,
  type Vraag,
} from "@/lib/enquete";
import {
  GROEP_KLEUREN,
  GemiddeldeStippen,
  GroepLegenda,
  SchaalLegenda,
  VerdelingRij,
} from "@/components/enquete/Grafieken";
import type { Survey, SurveyQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

const TITELS: Record<string, string> = {
  ai_beroep_verandering: "Hoeveel verandert AI het (toekomstige) beroep?",
  vaardigheden_belangrijker: "Welke vaardigheden worden door AI belangrijker?",
  vaardigheden_minder: "Welke vaardigheden worden door AI minder belangrijk?",
  voorbereiding: "Bereidt het onderwijs voldoende voor op werk met AI?",
  vwo_onderwerpen: "Welke onderwerpen moeten meer aandacht krijgen op het vwo?",
  keuzevak_ai: "Keuzevak ‘AI & digitale vaardigheden’",
};

/** Toelichting als de groepen een net iets andere vraag kregen. */
const TOELICHTING: Record<string, string> = {
  voorbereiding: "Leerlingen beoordelen hun eigen vakkenpakket, werknemers het huidige vwo. Niet iedere werknemer heeft goed zicht op het vwo.",
  keuzevak_ai: "Leerlingen: zou je het kiezen? Werknemers: moeten scholen het aanbieden?",
  ai_beroep_verandering: "Leerlingen: het beroep dat ze later willen doen. Werknemers: hun eigen beroep, de komende tien jaar.",
};

type Groep = { naam: string; kleur: string; n: number; vragen: SurveyQuestion[]; reacties: Reactie[] };

function groepNaam(s: Survey) {
  return s.slug ? s.slug.charAt(0).toUpperCase() + s.slug.slice(1).replace(/-/g, " ") : s.title;
}

export default async function VergelijkPage() {
  const supabase = await createClient();
  const { data: surveys } = await supabase
    .from("pws_surveys")
    .select("*")
    .not("slug", "is", null)
    .order("created_at");

  const volgorde = ["leerlingen", "docenten", "werknemers"];
  const plek = (s: Survey) => (volgorde.indexOf(s.slug ?? "") + 1 || volgorde.length + 1);
  const gekozen = ((surveys as Survey[]) ?? []).sort((a, b) => plek(a) - plek(b)).slice(0, GROEP_KLEUREN.length);

  const groepen: Groep[] = await Promise.all(
    gekozen.map(async (s, i) => {
      const [{ data: vragen }, { data: reacties }] = await Promise.all([
        supabase.from("pws_survey_questions").select("*").eq("survey_id", s.id).order("order_index"),
        supabase.rpc("pws_enquete_resultaten", { p_survey_id: s.id }),
      ]);
      const r = (reacties as Reactie[]) ?? [];
      return { naam: groepNaam(s), kleur: GROEP_KLEUREN[i], n: r.length, vragen: (vragen as SurveyQuestion[]) ?? [], reacties: r };
    }),
  );

  // Vergelijkbare vragen, in de volgorde waarin ze in de eerste enquête staan.
  const sleutels: string[] = [];
  for (const g of groepen)
    for (const v of g.vragen) {
      const k = v.config?.vergelijk;
      if (k && !sleutels.includes(k)) sleutels.push(k);
    }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/enquetes" className="text-sm text-slate-500 hover:text-slate-800">
        ← Terug naar enquêtes
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Enquêtes vergelijken</h1>
      <p className="mt-1 text-slate-500">Dezelfde vragen, per doelgroep naast elkaar. Percentages zijn van het aantal invullers per groep.</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {groepen.map((g) => (
          <div key={g.naam} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.kleur }} />
              {g.naam}
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{g.n}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {sleutels.map((k) => {
          const per = groepen
            .map((g) => ({ g, v: g.vragen.find((x) => x.config?.vergelijk === k && x.type !== "open") as Vraag | undefined }))
            .filter((x): x is { g: Groep; v: Vraag } => !!x.v);
          const open = groepen.flatMap((g) =>
            g.vragen
              .filter((x) => x.config?.vergelijk === k && x.type === "open")
              .map((v) => ({ g, v: v as Vraag, antwoorden: openAntwoorden(v as Vraag, g.reacties) })),
          );
          if (!per.length && !open.length) return null;
          return (
            <section key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">{TITELS[k] ?? (per[0] ?? open[0]).v.text}</h2>
              {TOELICHTING[k] && <p className="mt-1 text-xs text-slate-500">{TOELICHTING[k]}</p>}
              {per.length > 0 && (
                <>
                  <div className="mt-2">
                    <GroepLegenda groepen={per.map(({ g }) => g)} />
                  </div>
                  <div className="mt-4">
                    <Vergelijking per={per} />
                  </div>
                </>
              )}
              {open.map(({ g, v, antwoorden }) => (
                <details key={v.id} className="mt-4 rounded-xl bg-slate-50 px-3 py-2">
                  <summary className="cursor-pointer text-sm text-slate-700">
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.kleur }} />
                    {g.naam}: “{v.text}” <span className="text-slate-400">({antwoorden.length} antwoorden)</span>
                  </summary>
                  {antwoorden.length ? (
                    <ul className="mt-2 space-y-1.5">
                      {antwoorden.map((t, i) => (
                        <li key={i} className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">{t}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Nog geen antwoorden.</p>
                  )}
                </details>
              ))}
            </section>
          );
        })}
        {sleutels.length === 0 && <p className="text-sm text-slate-500">Er zijn nog geen vragen om te vergelijken.</p>}
      </div>
    </main>
  );
}

function Vergelijking({ per }: { per: { g: Groep; v: Vraag }[] }) {
  const eerste = per[0].v;

  if (eerste.type === "stellingen") {
    const items = eerste.config.kort ?? eerste.config.items ?? [];
    return (
      <div className="space-y-5">
        {items.map((label, i) => (
          <GemiddeldeStippen
            key={i}
            label={`${i + 1}. ${label}`}
            waarden={per.map(({ g, v }) => {
              const d = schaalVerdeling(v, g.reacties, i);
              return { naam: g.naam, kleur: g.kleur, gemiddelde: d.gemiddelde, n: d.n };
            })}
          />
        ))}
        <div className="flex justify-between text-xs text-slate-400">
          <span>1 helemaal oneens</span>
          <span>3 neutraal</span>
          <span>5 helemaal eens</span>
        </div>
      </div>
    );
  }

  if (eerste.type === "schaal") {
    const labels = labelsVoor(eerste);
    return (
      <div className="space-y-4">
        {per.map(({ g, v }) => (
          <VerdelingRij key={g.naam} label={g.naam} kleurStip={g.kleur} verdeling={schaalVerdeling(v, g.reacties)} labels={labels} />
        ))}
        <SchaalLegenda labels={labels} />
      </div>
    );
  }

  // Keuzevragen: per optie een staaf per groep.
  const tellingen = per.map(({ g, v }) => ({ g, ...telKeuzes(v, g.reacties) }));
  const opties: string[] = [];
  for (const { v } of per) for (const o of alleOpties(v)) if (!opties.includes(o)) opties.push(o);
  return (
    <div className="space-y-3">
      {opties.map((o) => (
        <div key={o}>
          <p className="text-sm text-slate-700">{o}</p>
          <div className="mt-1 space-y-[2px]">
            {tellingen.map(({ g, tellingen: t, beantwoord }) => {
              const n = t.find((x) => x.waarde === o)?.n ?? 0;
              const p = pct(n, beantwoord);
              return (
                <div key={g.naam} className="flex items-center gap-2" title={`${g.naam}: ${n} van ${beantwoord} (${p}%)`}>
                  <div className="h-2.5 flex-1 rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: g.kleur, minWidth: n ? 4 : 0 }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-600">{p}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
