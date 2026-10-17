import type { QuestionConfig, QuestionType, Voorwaarde } from "./types";

export const WEET_NIET = "weet ik niet";
export const ANDERS = "Anders";
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

/** Voldoet het antwoord aan (een van) de voorwaarde(n)? */
export function voldoet(als: Voorwaarde | Voorwaarde[], antwoorden: Antwoorden): boolean {
  const lijst = Array.isArray(als) ? als : [als];
  return lijst.some((t) => (antwoorden[t.vraag] ?? []).some((x) => t.waarden.includes(x)));
}

export function zichtbaar(v: Vraag, antwoorden: Antwoorden): boolean {
  return !v.config.toonAls || voldoet(v.config.toonAls, antwoorden);
}

/** De opgeslagen waarde bij een label: de vaste code als die er is, anders het label zelf. */
export function waardeVan(v: Vraag, label: string): string {
  const i = v.options.indexOf(label);
  return i >= 0 && v.config.codes?.[i] ? v.config.codes[i] : label;
}

/** Het label bij een opgeslagen waarde. */
export function labelVan(v: Vraag, waarde: string): string {
  const i = v.config.codes?.indexOf(waarde) ?? -1;
  return i >= 0 ? v.options[i] : waarde;
}

/** Opgeslagen waarde van de "Anders"-optie. */
export function andersWaarde(v: Vraag): string {
  return v.config.andersWaarde ?? ANDERS;
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
    if (!vraag.config.vervolg || nr === 0) nr++;
    if (vraag.type === "stellingen") {
      (vraag.config.items ?? []).forEach((_, item) => uit.push({ vraag, nr, item }));
    } else {
      uit.push({ vraag, nr });
    }
  }
  return uit;
}

/** Aantal genummerde vragen dat de invuller ziet (vervolgvragen tellen niet apart). */
export function aantalZichtbaar(vragen: Vraag[], antwoorden: Antwoorden) {
  return vragen.filter((v) => zichtbaar(v, antwoorden) && !v.config.vervolg).length;
}

/** Vraagnummers voor overzichten: een vervolgvraag krijgt het nummer van de vorige plus een letter. */
export function vraagNummers(vragen: Vraag[]): string[] {
  let nr = 0;
  let sub = 0;
  return vragen.map((v) => {
    if (v.config.vervolg && nr > 0) return `${nr}${String.fromCharCode(96 + ++sub)}`;
    sub = 0;
    return String(++nr);
  });
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
    if (!uit[v.id]?.includes(andersWaarde(v))) delete uit[andersSleutel(v.id)];
    const mag = optiesVoor(v, uit).map((o) => waardeVan(v, o));
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
      if (value === andersWaarde(s.vraag) && s.vraag.config.andersTekst && eigen) value = `${value}: ${eigen.slice(0, 200)}`;
      uit.push(s.item === undefined ? { question_id: s.vraag.id, value } : { question_id: s.vraag.id, value, item: s.item });
    }
  }
  return uit;
}

/* ---------- Resultaten ---------- */

export type Reactie = {
  id: string;
  created_at: string;
  answers: { q: string; i: number | null; v: string; ver?: number | null }[];
};

/** De antwoorden van één reactie in dezelfde vorm als tijdens het invullen. */
export function antwoordenVan(r: Reactie): Antwoorden {
  const uit: Antwoorden = {};
  for (const a of r.answers) (uit[sleutel(a.q, a.i ?? undefined)] ??= []).push(a.v);
  return uit;
}

/** Alleen de reacties met een bepaald antwoord op een vraag, bijvoorbeeld één doelgroep. */
export function filterReacties(reacties: Reactie[], qid: string, waarde: string): Reactie[] {
  return reacties.filter((r) => r.answers.some((a) => a.q === qid && a.i === null && a.v === waarde));
}

/** Markering in de export voor een vraag die door de route niet aan deze invuller is getoond. */
export const NIET_GETOOND = "[n.v.t.: niet getoond door route]";

function waarden(r: Reactie, qid: string, item?: number) {
  return r.answers.filter((a) => a.q === qid && (item === undefined ? a.i === null : a.i === item)).map((a) => a.v);
}

/** "Anders: tekst" telt mee als "Anders". */
function basisWaarde(v: Vraag, w: string) {
  const a = andersWaarde(v);
  return w.startsWith(`${a}: `) ? a : w;
}

/** De zelf getypte teksten bij "Anders". */
export function andersTeksten(v: Vraag, reacties: Reactie[]): string[] {
  const prefix = `${andersWaarde(v)}: `;
  return reacties
    .flatMap((r) => waarden(r, v.id))
    .filter((w) => w.startsWith(prefix))
    .map((w) => w.slice(prefix.length));
}

/**
 * Gedeelde antwoordcodes om enquêtes onderling te vergelijken. Enquêtes zonder
 * eigen codes (die labels opslaan) worden via deze lijst alsnog gekoppeld.
 */
export const GEDEELDE_CODES: Record<string, string[]> = {
  creativity: ["Creativiteit"],
  critical_thinking: ["Kritisch denken"],
  collaboration: ["Samenwerken"],
  communication: ["Communiceren", "Communicatie"],
  programming: ["Programmeren"],
  data_analysis: ["Data analyseren", "Data-analyse"],
  ai_skills: ["Werken met AI"],
  mathematics: ["Rekenen / wiskunde"],
  problem_solving: ["Probleemoplossend denken"],
  leadership: ["Leidinggeven"],
  ai_usage: ["AI gebruiken"],
  financial_skills: ["Financiële vaardigheden"],
  entrepreneurship: ["Ondernemerschap"],
  information_literacy: ["Kritisch omgaan met informatie"],
  psychology: ["Psychologie / gedrag"],
  daily: ["Dagelijks"],
  weekly: ["Een paar keer per week"],
  monthly: ["Een paar keer per maand"],
  less_than_monthly: ["Minder dan één keer per maand"],
  never: ["Nooit"],
  none: ["Geen van deze vaardigheden", "Geen van deze onderwerpen"],
  dont_know: ["Weet ik niet"],
  other: ["Anders", "Anders, namelijk..."],
};

const normaliseer = (t: string) => t.toLowerCase().replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim();
const CODE_BIJ_LABEL = new Map(
  Object.entries(GEDEELDE_CODES).flatMap(([code, labels]) => labels.map((l) => [normaliseer(l), code] as const)),
);

/** Vergelijkingssleutel van een optie: de vaste code, de gedeelde code bij het label, of het label zelf. */
export function vergelijkCode(v: Vraag, label: string): string {
  const eigen = waardeVan(v, label);
  if (eigen !== label) return eigen;
  return CODE_BIJ_LABEL.get(normaliseer(label)) ?? label;
}

export type Telling = { waarde: string; code: string; n: number };

/** Per optie het aantal invullers dat hem koos, plus het aantal invullers dat de vraag beantwoordde. */
export function telKeuzes(v: Vraag, reacties: Reactie[]): { tellingen: Telling[]; beantwoord: number } {
  const opties = alleOpties(v);
  const n = new Map<string, number>(opties.map((o) => [waardeVan(v, o), 0]));
  let beantwoord = 0;
  for (const r of reacties) {
    const w = new Set(waarden(r, v.id).map((x) => basisWaarde(v, x)));
    if (w.size) beantwoord++;
    for (const x of w) n.set(x, (n.get(x) ?? 0) + 1);
  }
  const tellingen = [...n.entries()].map(([opgeslagen, c]) => {
    const waarde = labelVan(v, opgeslagen);
    return { waarde, code: vergelijkCode(v, waarde), n: c };
  });
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

function csv(rijen: string[][]) {
  return rijen.map((rij) => rij.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

/**
 * CSV met één rij per invuller en één kolom per vraag (per stelling bij een stellingenblok).
 * Bevat de opgeslagen waarden: antwoordcodes, schaalscores 1-5 en "weet ik niet".
 * Een lege cel is niet ingevuld; een vraag die de route verborg krijgt NIET_GETOOND.
 */
export function naarCsv(vragen: Vraag[], reacties: Reactie[], surveyId = ""): string {
  const kop = ["Nr", "Respondent-ID", "Enquête-ID", "Ingevuld op"];
  const kolommen: { qid: string; item?: number }[] = [];
  const nummers = vraagNummers(vragen);
  vragen.forEach((v, i) => {
    if (v.type === "stellingen") {
      (v.config.items ?? []).forEach((s, item) => {
        kop.push(`${nummers[i]}.${item + 1} ${s}`);
        kolommen.push({ qid: v.id, item });
      });
    } else {
      kop.push(`${nummers[i]}. ${v.text}`);
      kolommen.push({ qid: v.id });
    }
  });
  const perId = new Map(vragen.map((v) => [v.id, v]));
  const rijen = reacties.map((r, n) => {
    const antw = antwoordenVan(r);
    return [
      String(n + 1),
      r.id,
      surveyId,
      new Date(r.created_at).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }),
      ...kolommen.map((k) => {
        const w = waarden(r, k.qid, k.item);
        if (!w.length && !zichtbaar(perId.get(k.qid)!, antw)) return NIET_GETOOND;
        return w.join("; ");
      }),
    ];
  });
  return csv([kop, ...rijen]);
}

/**
 * Lange tabel: één rij per gegeven antwoord, met respondent-, enquête- en vraag-ID en de vraagversie.
 * Handig voor analyse in Excel, SPSS of R en om enquêtes te combineren.
 */
export function naarLangeCsv(vragen: Vraag[], reacties: Reactie[], surveyId: string): string {
  const nummers = new Map(vraagNummers(vragen).map((n, i) => [vragen[i].id, n]));
  const kop = ["respondent_id", "enquete_id", "ingevuld_op", "vraag_id", "vraag_nr", "vraag_versie", "stelling", "waarde"];
  const rijen = reacties.flatMap((r) =>
    r.answers.map((a) => [
      r.id,
      surveyId,
      r.created_at,
      a.q,
      nummers.get(a.q) ?? "(oude vraag)",
      a.ver == null ? "" : String(a.ver),
      a.i == null ? "" : String(a.i + 1),
      a.v,
    ]),
  );
  return csv([kop, ...rijen]);
}

export function pct(n: number, totaal: number) {
  return totaal ? Math.round((n / totaal) * 100) : 0;
}
