import type { QuestionConfig, QuestionType } from "./types";

export const WEET_NIET = "weet ik niet";
export const ANDERS = "Anders";
const ANDERS_PREFIX = "Anders: ";
export const SCHAAL_WAARDEN = ["1", "2", "3", "4", "5"];
export const STANDAARD_LABELS = ["Helemaal oneens", "Oneens", "Neutraal", "Eens", "Helemaal eens"];

export type Vraag = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  section: string | null;
  config: QuestionConfig;
};

/** Antwoorden van één invuller. Sleutel: vraag-id, of `vraag-id:index` bij een stelling. */
export type Antwoorden = Record<string, string[]>;

export function sleutel(qid: string, item?: number) {
  return item === undefined ? qid : `${qid}:${item}`;
}

/** Sleutel voor de eigen tekst bij "Anders". */
export function andersSleutel(qid: string) {
  return `${qid}#anders`;
}

export function zichtbaar(v: Vraag, antwoorden: Antwoorden): boolean {
  const t = v.config.toonAls;
  if (!t) return true;
  return (antwoorden[t.vraag] ?? []).some((x) => t.waarden.includes(x));
}

export function labelsVoor(v: Vraag): string[] {
  return v.config.labels?.length === 5 ? v.config.labels : STANDAARD_LABELS;
}

/** Alle opties die bij een vraag kunnen voorkomen (ook uit afhankelijke groepen). */
export function alleOpties(v: Vraag): string[] {
  if (v.type === "janee") return ["Ja", "Nee"];
  const uit = [...v.options];
  for (const g of v.config.groepen ?? []) for (const o of g.opties) if (!uit.includes(o)) uit.push(o);
  return uit;
}

/** Opties die de invuller nu ziet; bij een afhankelijke vraag op basis van het eerdere antwoord. */
export function optiesVoor(v: Vraag, antwoorden: Antwoorden): string[] {
  if (v.type === "janee") return ["Ja", "Nee"];
  const dep = v.config.afhankelijkVan;
  if (!dep || !v.config.groepen?.length) return v.options;
  const eerder = antwoorden[dep]?.[0];
  const groep = v.config.groepen.find((g) => eerder !== undefined && g.als.includes(eerder));
  return groep ? groep.opties : v.options.length ? v.options : alleOpties(v);
}

export type Stap = { vraag: Vraag; nr: number; item?: number };

/** Eén stap per zichtbare vraag; een stellingenblok krijgt één stap per stelling. */
export function stappen(vragen: Vraag[], antwoorden: Antwoorden = {}): Stap[] {
  const uit: Stap[] = [];
  let nr = 0;
  for (const vraag of vragen) {
    if (!zichtbaar(vraag, antwoorden)) continue;
    nr++;
    if (vraag.type === "stellingen") {
      (vraag.config.items ?? []).forEach((_, item) => uit.push({ vraag, nr, item }));
    } else {
      uit.push({ vraag, nr });
    }
  }
  return uit;
}

export function aantalZichtbaar(vragen: Vraag[], antwoorden: Antwoorden) {
  return vragen.filter((v) => zichtbaar(v, antwoorden)).length;
}

export function stapBeantwoord(stap: Stap, antwoorden: Antwoorden): boolean {
  const w = antwoorden[sleutel(stap.vraag.id, stap.item)] ?? [];
  return w.some((x) => x.trim() !== "");
}

/** Keuze aan- of uitzetten bij een vraag met meerdere antwoorden. */
export function wisselKeuze(huidig: string[], optie: string, config: QuestionConfig): string[] {
  if (huidig.includes(optie)) return huidig.filter((x) => x !== optie);
  const exclusief = config.exclusief ?? [];
  if (exclusief.includes(optie)) return [optie];
  const zonder = huidig.filter((x) => !exclusief.includes(x));
  if (config.max && zonder.length >= config.max) return zonder;
  return [...zonder, optie];
}

/** Antwoorden die niet (meer) passen bij de getoonde opties weghalen, bv. na een ander antwoord op vraag 1. */
export function opschonen(vragen: Vraag[], antwoorden: Antwoorden): Antwoorden {
  const uit: Antwoorden = { ...antwoorden };
  for (const v of vragen) {
    if (!zichtbaar(v, uit)) {
      for (const k of Object.keys(uit)) if (k === v.id || k.startsWith(`${v.id}:`) || k === andersSleutel(v.id)) delete uit[k];
      continue;
    }
    if (v.type !== "meerkeuze" && v.type !== "meerdere") continue;
    if (!uit[v.id]?.includes(ANDERS)) delete uit[andersSleutel(v.id)];
    const mag = optiesVoor(v, uit);
    if (uit[v.id]) uit[v.id] = uit[v.id].filter((x) => mag.includes(x));
  }
  return uit;
}

export type IndienAntwoord = { question_id: string; value: string; item?: number };

export function naarIndienen(vragen: Vraag[], antwoorden: Antwoorden): IndienAntwoord[] {
  const uit: IndienAntwoord[] = [];
  for (const s of stappen(vragen, antwoorden)) {
    const eigen = (antwoorden[andersSleutel(s.vraag.id)]?.[0] ?? "").trim();
    for (let value of antwoorden[sleutel(s.vraag.id, s.item)] ?? []) {
      if (!value.trim()) continue;
      if (value === ANDERS && s.vraag.config.andersTekst && eigen) value = ANDERS_PREFIX + eigen.slice(0, 200);
      uit.push(s.item === undefined ? { question_id: s.vraag.id, value } : { question_id: s.vraag.id, value, item: s.item });
    }
  }
  return uit;
}

/* ---------- Resultaten ---------- */

export type Reactie = {
  id: string;
  created_at: string;
  answers: { q: string; i: number | null; v: string }[];
};

function waarden(r: Reactie, qid: string, item?: number) {
  return r.answers.filter((a) => a.q === qid && (item === undefined ? a.i === null : a.i === item)).map((a) => a.v);
}

/** "Anders: tekst" telt mee als "Anders". */
function basisWaarde(w: string) {
  return w.startsWith(ANDERS_PREFIX) ? ANDERS : w;
}

/** De zelf getypte teksten bij "Anders". */
export function andersTeksten(v: Vraag, reacties: Reactie[]): string[] {
  return reacties
    .flatMap((r) => waarden(r, v.id))
    .filter((w) => w.startsWith(ANDERS_PREFIX))
    .map((w) => w.slice(ANDERS_PREFIX.length));
}

export type Telling = { waarde: string; n: number };

/** Per optie het aantal invullers dat hem koos, plus het aantal invullers dat de vraag beantwoordde. */
export function telKeuzes(v: Vraag, reacties: Reactie[]): { tellingen: Telling[]; beantwoord: number } {
  const opties = alleOpties(v);
  const n: Record<string, number> = Object.fromEntries(opties.map((o) => [o, 0]));
  let beantwoord = 0;
  for (const r of reacties) {
    const w = new Set(waarden(r, v.id).map(basisWaarde));
    if (w.size) beantwoord++;
    for (const x of w) n[x] = (n[x] ?? 0) + 1;
  }
  const tellingen = Object.entries(n).map(([waarde, c]) => ({ waarde, n: c }));
  return { tellingen, beantwoord };
}

export type Verdeling = {
  /** aantallen voor 1 t/m 5 */
  counts: number[];
  weetNiet: number;
  /** aantal invullers met een score 1-5 */
  n: number;
  gemiddelde: number | null;
};

export function schaalVerdeling(v: Vraag, reacties: Reactie[], item?: number): Verdeling {
  const counts = [0, 0, 0, 0, 0];
  let weetNiet = 0;
  for (const r of reacties) {
    const w = waarden(r, v.id, item)[0];
    if (w === undefined) continue;
    if (w === WEET_NIET) weetNiet++;
    else {
      const i = SCHAAL_WAARDEN.indexOf(w);
      if (i >= 0) counts[i]++;
    }
  }
  const n = counts.reduce((a, b) => a + b, 0);
  const som = counts.reduce((a, c, i) => a + c * (i + 1), 0);
  return { counts, weetNiet, n, gemiddelde: n ? som / n : null };
}

export function openAntwoorden(v: Vraag, reacties: Reactie[]): string[] {
  return reacties.flatMap((r) => waarden(r, v.id)).filter((x) => x.trim());
}

/** CSV met één rij per invuller en één kolom per vraag (per stelling bij een stellingenblok). */
export function naarCsv(vragen: Vraag[], reacties: Reactie[]): string {
  const kop = ["Respondent", "Ingevuld op"];
  const kolommen: { qid: string; item?: number }[] = [];
  vragen.forEach((v, i) => {
    if (v.type === "stellingen") {
      (v.config.items ?? []).forEach((s, item) => {
        kop.push(`${i + 1}.${item + 1} ${s}`);
        kolommen.push({ qid: v.id, item });
      });
    } else {
      kop.push(`${i + 1}. ${v.text}`);
      kolommen.push({ qid: v.id });
    }
  });
  const rijen = reacties.map((r, n) => [
    String(n + 1),
    new Date(r.created_at).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }),
    ...kolommen.map((k) => waarden(r, k.qid, k.item).join("; ")),
  ]);
  return [kop, ...rijen]
    .map((rij) => rij.map((c) => `"${c.replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
}

export function pct(n: number, totaal: number) {
  return totaal ? Math.round((n / totaal) * 100) : 0;
}
