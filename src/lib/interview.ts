/** Interviewmodule: types en pure hulpfuncties (privacy, vergelijking, export, controle van AI-citaten). */

export type IvStatus = "concept" | "uitgenodigd" | "gestart" | "afgerond" | "gesloten";

export const IV_STATUS_LABEL: Record<IvStatus, string> = {
  concept: "Concept",
  uitgenodigd: "Uitgenodigd",
  gestart: "Gestart",
  afgerond: "Afgerond",
  gesloten: "Gesloten",
};

export const IV_STATUS_STIJL: Record<IvStatus, string> = {
  concept: "bg-slate-100 text-slate-600",
  uitgenodigd: "bg-sky-100 text-sky-700",
  gestart: "bg-amber-100 text-amber-800",
  afgerond: "bg-emerald-100 text-emerald-700",
  gesloten: "bg-slate-200 text-slate-600",
};

/** Een vraag zoals die vastligt in een uitnodiging (snapshot). */
export type IvVraag = {
  key: string;
  tekst: string;
  toelichting: string | null;
  /** Engelse tekst; ontbreekt bij vragen zonder vertaling */
  tekst_en?: string | null;
  toelichting_en?: string | null;
  verplicht: boolean;
  vraagtype: "open";
  themas: string[];
  algemeen: boolean;
};

export type IvToestemming = {
  deelname: boolean;
  naam_vermelden: boolean;
  citeren: boolean;
  ai: boolean;
  gegeven_op: string;
};

export type IvUitnodiging = {
  id: string;
  type_id: string | null;
  type_naam: string;
  naam: string;
  email: string | null;
  functie: string | null;
  organisatie: string | null;
  boodschap: string | null;
  aanspreekvorm: "u" | "je";
  intro: string | null;
  vragen: IvVraag[];
  status: IvStatus;
  gearchiveerd: boolean;
  toestemming: IvToestemming | null;
  uitgenodigd_op: string | null;
  laatste_activiteit: string | null;
  afgerond_op: string | null;
  bewaren_tot: string | null;
  created_at: string;
  /** taal die de respondent koos; null = Nederlands (standaard) */
  taal?: "nl" | "en" | null;
};

export type IvAntwoord = { uitnodiging_id: string; vraag_key: string; antwoord: string; bijgewerkt_op: string };

export type IvThema = { key: string; naam: string; beschrijving: string | null; order_index: number };

export type IvType = {
  id: string;
  slug: string;
  naam: string;
  beschrijving: string | null;
  aanspreekvorm: "u" | "je";
  intro: string | null;
  naam_en: string | null;
  intro_en: string | null;
  status: "concept" | "gepubliceerd";
  order_index: number;
  gearchiveerd: boolean;
};

export type IvVraagBron = {
  id: string;
  key: string;
  algemeen: boolean;
  tekst: string;
  tekst_je: string | null;
  toelichting: string | null;
  toelichting_je: string | null;
  tekst_en: string | null;
  toelichting_en: string | null;
  vraagtype: "open";
  themas: string[];
  actief: boolean;
};

export const ZONDER_THEMA = "_geen";

/** De vraag zoals de respondent hem zag: Engels als die taal gekozen is en er een vertaling is. */
export function vraagTekstVoor(u: Pick<IvUitnodiging, "taal">, v: IvVraag): string {
  return u.taal === "en" && v.tekst_en ? v.tekst_en : v.tekst;
}

/** Geschatte invultijd in minuten voor open vragen (ongeveer 2,5 minuut per vraag, afgerond op 5). */
export function geschatteMinuten(aantalVragen: number): number {
  return Math.max(5, Math.round((aantalVragen * 2.5) / 5) * 5);
}

/* ---------------- Privacy ---------------- */

/** Vast respondentnummer op volgorde van aanmaken, zodat 'Respondent 3' overal dezelfde persoon is. */
export function respondentNummers(uitnodigingen: Pick<IvUitnodiging, "id" | "created_at">[]): Map<string, number> {
  const op = [...uitnodigingen].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return new Map(op.map((u, i) => [u.id, i + 1]));
}

export type Weergave = {
  label: string;
  /** naam als die genoemd mag worden, anders null */
  naam: string | null;
  functie: string | null;
  organisatie: string | null;
  magCiteren: boolean;
  naamToegestaan: boolean;
};

/**
 * Hoe een respondent in overzichten en exports verschijnt.
 * Naam, functie en organisatie alleen als de respondent naamvermelding toestond én de export niet anoniem is.
 */
export function weergave(u: IvUitnodiging, nr: number, anoniem: boolean): Weergave {
  const naamToegestaan = !!u.toestemming?.naam_vermelden;
  const toon = naamToegestaan && !anoniem;
  return {
    label: toon ? u.naam : `Respondent ${nr} (${u.type_naam})`,
    naam: toon ? u.naam : null,
    functie: toon ? u.functie : null,
    organisatie: toon ? u.organisatie : null,
    magCiteren: !!u.toestemming?.citeren,
    naamToegestaan,
  };
}

export function privacyNotitie(w: Weergave): string[] {
  const uit: string[] = [];
  if (!w.naamToegestaan) uit.push("Naam en organisatie niet noemen in het profielwerkstuk.");
  if (!w.magCiteren) uit.push("Niet letterlijk citeren: alleen in eigen woorden weergeven.");
  return uit;
}

/* ---------------- Vergelijking per thema ---------------- */

export type VergelijkVraag = {
  key: string;
  tekst: string;
  antwoorden: { uitnodiging_id: string; tekst: string; antwoord: string }[];
};

/**
 * Alle vragen binnen een thema met de antwoorden van de gekozen respondenten.
 * Algemene vragen hebben in elk interview dezelfde sleutel en komen dus samen in één rij.
 * De vraagtekst is die van de respondent zelf (snapshot), want u- en je-vorm kunnen verschillen.
 */
export function vergelijkPerThema(
  uitnodigingen: IvUitnodiging[],
  antwoorden: IvAntwoord[],
  thema: string,
): VergelijkVraag[] {
  const perKey = new Map<string, VergelijkVraag>();
  const antw = new Map(antwoorden.map((a) => [`${a.uitnodiging_id}|${a.vraag_key}`, a.antwoord]));
  for (const u of uitnodigingen) {
    for (const v of u.vragen) {
      const hoort = thema === ZONDER_THEMA ? v.themas.length === 0 : v.themas.includes(thema);
      if (!hoort) continue;
      const tekst = (antw.get(`${u.id}|${v.key}`) ?? "").trim();
      let rij = perKey.get(v.key);
      if (!rij) {
        rij = { key: v.key, tekst: v.tekst, antwoorden: [] };
        perKey.set(v.key, rij);
      }
      rij.antwoorden.push({ uitnodiging_id: u.id, tekst: vraagTekstVoor(u, v), antwoord: tekst });
    }
  }
  // Algemene vragen eerst, daarna op volgorde van eerste voorkomen.
  return [...perKey.values()].sort((a, b) => Number(!a.key.startsWith("alg_")) - Number(!b.key.startsWith("alg_")));
}

/* ---------------- CSV ---------------- */

function csv(rijen: string[][]) {
  return rijen.map((rij) => rij.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

/** Eén rij per vraag per respondent, met de vraagtekst die de respondent zag. */
export function interviewsNaarCsv(
  uitnodigingen: IvUitnodiging[],
  antwoorden: IvAntwoord[],
  themas: IvThema[],
  nummers: Map<string, number>,
  anoniem: boolean,
): string {
  const themaNaam = new Map(themas.map((t) => [t.key, t.naam]));
  const antw = new Map(antwoorden.map((a) => [`${a.uitnodiging_id}|${a.vraag_key}`, a.antwoord]));
  const kop = [
    "respondent_nr", "respondent", "functie", "organisatie", "interviewtype", "status", "afgerond_op", "taal",
    "naam_vermelden", "letterlijk_citeren", "vraag_nr", "vraag_id", "vraag", "vraag_zoals_gesteld", "themas", "antwoord",
  ];
  const rijen: string[][] = [kop];
  for (const u of uitnodigingen) {
    const nr = nummers.get(u.id) ?? 0;
    const w = weergave(u, nr, anoniem);
    u.vragen.forEach((v, i) => {
      rijen.push([
        String(nr), w.label, w.functie ?? "", w.organisatie ?? "", u.type_naam, u.status, u.afgerond_op ?? "",
        u.taal === "en" ? "Engels" : "Nederlands",
        w.naamToegestaan ? "ja" : "nee", w.magCiteren ? "ja" : "nee",
        String(i + 1), v.key, v.tekst, vraagTekstVoor(u, v), v.themas.map((t) => themaNaam.get(t) ?? t).join(", "),
        antw.get(`${u.id}|${v.key}`) ?? "",
      ]);
    });
  }
  return csv(rijen);
}

/* ---------------- Controle van AI-uitvoer ---------------- */

export type AiBron = { respondent: string; vraag_key: string };
export type AiCitaat = AiBron & { citaat: string };
export type AiPunt = { tekst: string; bronnen: AiBron[] };
export type AiAnalyse = {
  samenvatting: string;
  themas: AiPunt[];
  overeenkomsten: AiPunt[];
  verschillen: AiPunt[];
  citaten: AiCitaat[];
  vervolgvragen: string[];
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Houdt alleen uitspraken over die herleidbaar zijn naar echte antwoorden, en alleen citaten
 * die letterlijk (op witruimte na) in het antwoord van die respondent staan.
 * `bronnen` koppelt het pseudoniem (bv. "R2") aan de antwoorden van die respondent.
 */
export function controleerAiAnalyse(
  ruw: AiAnalyse,
  bronnen: Map<string, Map<string, string>>,
): { analyse: AiAnalyse; verwijderd: number } {
  let verwijderd = 0;
  const geldigeBron = (b: AiBron) => !!bronnen.get(b.respondent)?.get(b.vraag_key)?.trim();
  const punten = (lijst: AiPunt[] | undefined) =>
    (lijst ?? [])
      .map((p) => ({ tekst: String(p.tekst ?? ""), bronnen: (p.bronnen ?? []).filter(geldigeBron) }))
      .filter((p) => {
        const ok = p.tekst.trim() !== "" && p.bronnen.length > 0;
        if (!ok) verwijderd++;
        return ok;
      });
  const citaten = (ruw.citaten ?? []).filter((c) => {
    const antwoord = bronnen.get(c.respondent)?.get(c.vraag_key);
    const ok = !!antwoord && !!c.citaat?.trim() && norm(antwoord).includes(norm(c.citaat));
    if (!ok) verwijderd++;
    return ok;
  });
  return {
    analyse: {
      samenvatting: String(ruw.samenvatting ?? ""),
      themas: punten(ruw.themas),
      overeenkomsten: punten(ruw.overeenkomsten),
      verschillen: punten(ruw.verschillen),
      citaten,
      vervolgvragen: (ruw.vervolgvragen ?? []).map(String).filter((v) => v.trim()),
    },
    verwijderd,
  };
}

/** Tekens die de standaard-PDF-lettertypen niet kennen vervangen, zonder Nederlandse tekens te verliezen. */
export function pdfVeilig(tekst: string, kan: (teken: string) => boolean): string {
  let uit = "";
  for (const t of tekst.replace(/\r\n?/g, "\n").replace(/\t/g, "    ")) {
    if (t === "\n" || kan(t)) uit += t;
    else if (/[‘’‚′]/.test(t)) uit += "'";
    else if (/[“”„″]/.test(t)) uit += '"';
    else if (/[‐-―−]/.test(t)) uit += "-";
    else if (t === "…") uit += "...";
    else if (/\s/.test(t)) uit += " ";
    else uit += "?";
  }
  return uit;
}
