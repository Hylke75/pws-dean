import { labelsVoor, pct, schaalVerdeling, telKeuzes, type Reactie, type Vraag } from "@/lib/enquete";
import { GemiddeldeStippen, SchaalLegenda, VerdelingRij } from "./Grafieken";

export type VergelijkGroep = { naam: string; kleur: string; n: number; reacties: Reactie[] };

export const TITELS: Record<string, string> = {
  ai_beroep_verandering: "Hoeveel verandert AI het (toekomstige) beroep?",
  vaardigheden_belangrijker: "Welke vaardigheden worden door AI belangrijker?",
  vaardigheden_minder: "Welke vaardigheden worden door AI minder belangrijk?",
  voorbereiding: "Bereidt het onderwijs voldoende voor op werk met AI?",
  vwo_onderwerpen: "Welke onderwerpen moeten meer aandacht krijgen op het vwo?",
  keuzevak_ai: "Keuzevak ‘AI & digitale vaardigheden’",
};

/** Toelichting als de groepen een net iets andere vraag kregen. */
export const TOELICHTING: Record<string, string> = {
  voorbereiding: "Leerlingen beoordelen hun eigen vakkenpakket, werknemers het huidige vwo. Niet iedere werknemer heeft goed zicht op het vwo.",
  keuzevak_ai: "Leerlingen: zou je het kiezen? Werknemers: moeten scholen het aanbieden?",
  ai_beroep_verandering: "Leerlingen: het beroep dat ze later willen doen. Werknemers: hun eigen beroep, de komende tien jaar.",
};

/** Dezelfde vraag per doelgroep naast elkaar. */
export default function Vergelijking({ per }: { per: { g: VergelijkGroep; v: Vraag }[] }) {
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

  // Keuzevragen: per antwoordcode een staaf per groep; het label komt van de eerste groep die de optie heeft.
  const tellingen = per.map(({ g, v }) => ({ g, ...telKeuzes(v, g.reacties) }));
  const opties = new Map<string, string>();
  for (const t of tellingen) for (const x of t.tellingen) if (!opties.has(x.code)) opties.set(x.code, x.waarde);
  return (
    <div className="space-y-3">
      {[...opties.entries()].map(([code, label]) => (
        <div key={code}>
          <p className="text-sm text-slate-700">{label}</p>
          <div className="mt-1 space-y-[2px]">
            {tellingen.map(({ g, tellingen: t, beantwoord }) => {
              const n = t.find((x) => x.code === code)?.n ?? 0;
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
