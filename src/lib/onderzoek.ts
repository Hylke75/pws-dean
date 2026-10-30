import {
  andersTeksten,
  labelsVoor,
  openAntwoorden,
  pct,
  schaalVerdeling,
  telKeuzes,
  vraagNummers,
  type Reactie,
  type Vraag,
} from "@/lib/enquete";

/**
 * Antwoorden op de hoofd- en deelvragen uit de eigen data (enquêtes en interviews).
 * De AI schrijft de tekst en kiest welke grafieken erbij horen; de grafieken zelf
 * en alle cijfers rekent het systeem uit de data.
 */

/** Oude versies en de voorbeeldenquête horen niet bij het eigen onderzoek. */
export function isEchteEnquete(title: string): boolean {
  return !/^oud/i.test(title) && !/data 2/i.test(title);
}

export type OnderzoekEnquete = { id: string; title: string; vragen: Vraag[]; reacties: Reactie[] };
export type OnderzoekInterview = {
  label: string;
  type: string;
  magCiteren: boolean;
  antwoorden: { vraag: string; antwoord: string }[];
};

/** Korte code per vraag, bijv. "E2-V5" = enquête 2, vraag 5. */
export type VraagRef = { code: string; surveyId: string; vraagId: string; nummer: string };

export function vraagRefs(enquetes: OnderzoekEnquete[]): VraagRef[] {
  return enquetes.flatMap((e, i) => {
    const nrs = vraagNummers(e.vragen);
    return e.vragen.map((v, j) => ({ code: `E${i + 1}-V${nrs[j]}`, surveyId: e.id, vraagId: v.id, nummer: nrs[j] }));
  });
}

const kort = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** De uitkomsten van één vraag als tekst, met alleen uitgerekende cijfers. */
export function vraagSamenvatting(v: Vraag, reacties: Reactie[]): string {
  if (v.type === "open") {
    const lijst = openAntwoorden(v, reacties);
    if (!lijst.length) return "geen antwoorden";
    return `${lijst.length} open antwoorden, bijvoorbeeld:\n${lijst
      .slice(0, 25)
      .map((t) => `  - "${kort(t.replace(/\s+/g, " "), 220)}"`)
      .join("\n")}`;
  }
  if (v.type === "schaal" || v.type === "stellingen") {
    const labels = labelsVoor(v);
    const items = v.type === "stellingen" ? (v.config.items ?? []).map((s, i) => ({ s, i })) : [{ s: "", i: undefined }];
    return items
      .map(({ s, i }) => {
        const d = schaalVerdeling(v, reacties, i);
        const verdeling = d.counts.map((c, k) => `${labels[k]} ${c} (${pct(c, d.n)}%)`).join(", ");
        const eens = d.counts[3] + d.counts[4];
        const gem = d.gemiddelde === null ? "–" : d.gemiddelde.toFixed(1).replace(".", ",");
        return `${s ? `  stelling "${s}": ` : ""}n = ${d.n}, gemiddeld ${gem} op 1–5, ${labels[3]}/${labels[4]} samen ${pct(eens, d.n)}% · ${verdeling}${
          d.weetNiet ? `, weet niet ${d.weetNiet}` : ""
        }`;
      })
      .join("\n");
  }
  const { tellingen, beantwoord } = telKeuzes(v, reacties);
  const anders = andersTeksten(v, reacties);
  return `${beantwoord} invullers${v.type === "meerdere" ? " (meerdere antwoorden mogelijk)" : ""}: ${[...tellingen]
    .sort((a, b) => b.n - a.n)
    .map((t) => `${t.waarde} ${t.n} (${pct(t.n, beantwoord)}%)`)
    .join(", ")}${anders.length ? `\n  bij "Anders": ${anders.slice(0, 10).map((a) => `"${kort(a, 80)}"`).join(", ")}` : ""}`;
}

/** Alle data als tekst voor de AI, met de vraagcodes waarnaar de AI kan verwijzen. */
export function dataVoorAi(enquetes: OnderzoekEnquete[], interviews: OnderzoekInterview[]): string {
  const refs = vraagRefs(enquetes);
  const delen: string[] = [];
  enquetes.forEach((e) => {
    delen.push(`### Enquête: ${e.title} (${e.reacties.length} reacties)`);
    for (const v of e.vragen) {
      const ref = refs.find((r) => r.vraagId === v.id && r.surveyId === e.id)!;
      delen.push(`[${ref.code}] ${v.text}\n${vraagSamenvatting(v, e.reacties)}`);
    }
  });
  if (interviews.length) {
    delen.push("### Interviews");
    for (const iv of interviews) {
      delen.push(
        `Interview met ${iv.label} (${iv.type}). ${iv.magCiteren ? "Mag letterlijk geciteerd worden." : "NIET letterlijk citeren, alleen in eigen woorden weergeven."}\n${iv.antwoorden
          .map((a) => `Vraag: ${a.vraag}\nAntwoord: ${a.antwoord}`)
          .join("\n\n")}`,
      );
    }
  } else {
    delen.push("### Interviews\nEr zijn nog geen afgeronde interviews (met toestemming voor AI-analyse).");
  }
  return delen.join("\n\n");
}

export type GrafiekKeuze = { code: string; waarom: string };
export type Antwoord = {
  antwoord: string;
  onderbouwing: string[];
  grafieken: GrafiekKeuze[];
  interviews: string;
  beperkingen: string;
};
export type OnderzoeksAntwoorden = {
  deelvragen: (Antwoord & { nummer: number })[];
  hoofdvraag: Antwoord;
  algemeen: string;
};

const tekst = (x: unknown) => (typeof x === "string" ? x.trim() : "");
const lijst = (x: unknown) => (Array.isArray(x) ? x.map(tekst).filter(Boolean) : []);

/** Controleert het AI-antwoord en houdt alleen grafieken over die echt bestaan. */
export function controleerAntwoorden(raw: unknown, refs: VraagRef[], aantalDeelvragen: number): OnderzoeksAntwoorden {
  const codes = new Set(refs.map((r) => r.code));
  const obj = (raw ?? {}) as Record<string, unknown>;
  const antwoord = (x: unknown): Antwoord => {
    const a = (x ?? {}) as Record<string, unknown>;
    const gezien = new Set<string>();
    const grafieken = (Array.isArray(a.grafieken) ? a.grafieken : [])
      .map((g) => ({ code: tekst((g as Record<string, unknown>)?.code), waarom: tekst((g as Record<string, unknown>)?.waarom) }))
      .filter((g) => codes.has(g.code) && !gezien.has(g.code) && gezien.add(g.code))
      .slice(0, 6);
    return {
      antwoord: tekst(a.antwoord),
      onderbouwing: lijst(a.onderbouwing),
      grafieken,
      interviews: tekst(a.interviews),
      beperkingen: tekst(a.beperkingen),
    };
  };
  const dv = Array.isArray(obj.deelvragen) ? obj.deelvragen : [];
  const deelvragen = Array.from({ length: aantalDeelvragen }, (_, i) => {
    const gevonden = dv.find((d) => Number((d as Record<string, unknown>)?.nummer) === i + 1) ?? dv[i];
    return { nummer: i + 1, ...antwoord(gevonden) };
  });
  return { deelvragen, hoofdvraag: antwoord(obj.hoofdvraag), algemeen: tekst(obj.algemeen) };
}

/** Korte naam van een enquête, bijv. "leerlingen en studenten". */
export function groepNaam(title: string): string {
  return title.split("–").pop()!.trim();
}

export type Figuur =
  | { soort: "enkel"; code: string; waarom: string; enquete: number; vraag: Vraag; nummer: string }
  | { soort: "vergelijk"; code: string; waarom: string; sleutel: string; per: { enquete: number; vraag: Vraag }[] };

/**
 * Zet de grafiekkeuze van de AI om naar figuren. Staat dezelfde vraag (zelfde vergelijk-sleutel)
 * ook in andere enquêtes, dan wordt het één vergelijkingsgrafiek met alle doelgroepen.
 */
export function figurenVoor(grafieken: GrafiekKeuze[], enquetes: OnderzoekEnquete[]): Figuur[] {
  const refs = vraagRefs(enquetes);
  const uit: Figuur[] = [];
  const gehad = new Set<string>();
  for (const g of grafieken) {
    const r = refs.find((x) => x.code === g.code);
    const ei = r ? enquetes.findIndex((e) => e.id === r.surveyId) : -1;
    const v = r && ei >= 0 ? enquetes[ei].vragen.find((x) => x.id === r.vraagId) : undefined;
    if (!r || !v) continue;
    const sleutel = v.config.vergelijk;
    const per = sleutel
      ? enquetes
          .map((e, i) => ({ enquete: i, vraag: e.vragen.find((x) => x.config.vergelijk === sleutel && x.type !== "open") }))
          .filter((x): x is { enquete: number; vraag: Vraag } => !!x.vraag)
      : [];
    if (sleutel && v.type !== "open" && per.length > 1) {
      if (gehad.has(`k:${sleutel}`)) continue;
      gehad.add(`k:${sleutel}`);
      uit.push({ soort: "vergelijk", code: g.code, waarom: g.waarom, sleutel, per });
    } else {
      if (gehad.has(g.code)) continue;
      gehad.add(g.code);
      uit.push({ soort: "enkel", code: g.code, waarom: g.waarom, enquete: ei, vraag: v, nummer: r.nummer });
    }
  }
  return uit;
}
