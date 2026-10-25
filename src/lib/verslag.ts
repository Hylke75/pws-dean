import type { LogEntry, Source, Subquestion } from "@/lib/types";
import { toApa } from "@/lib/apa";
import { fmtDate } from "@/lib/dates";
import { LOGBOEK_DOEL_UREN } from "@/lib/constants";

/**
 * Opbouw van het eindverslag, naar het voorbeeld-PWS: inleiding, één hoofdstuk per deelvraag
 * (met paragrafen en een eigen conclusie), conclusie, reflectie, bronnen en bijlagen.
 * Wat al in de tracker staat, komt automatisch mee; wat de leerling nog moet schrijven
 * staat als invulveld bij het hoofdstuk.
 */

export type AutoBlok = { titel: string; tekst: string; link?: { href: string; label: string } };

export type SchrijfVeld = {
  key: string;
  label: string;
  hint: string;
  /** tekst die de leerling met één klik als begin kan gebruiken */
  start?: string;
  /** 1 = kort invulveld (bijv. titel) */
  regels?: number;
};

export type Hoofdstuk = {
  key: string;
  nummer: string;
  titel: string;
  uitleg: string;
  auto: AutoBlok[];
  schrijven: SchrijfVeld[];
  /** verzamelt wat de leerling elders schreef (bijv. de conclusies per hoofdstuk) */
  verzamel?: { titel: string; velden: { label: string; key: string }[] };
  aandacht?: string[];
  bijlage?: boolean;
};

export type VerslagEnquete = { id: string; title: string; reacties: number; vragen: number };
export type VerslagInterview = { label: string; type: string; antwoorden: { vraag: string; antwoord: string }[] };

export type VerslagInput = {
  veldData: Record<number, Record<string, string>>;
  deelvragen: Subquestion[];
  bronnen: Source[];
  logboek: LogEntry[];
  enquetes: VerslagEnquete[];
  interviews: VerslagInterview[];
  naam: string | null;
  inleverdatum: string | null;
  /** fase-id per volgnummer, voor links naar een fase */
  faseIds: Record<number, string>;
};

/** Welk eigen onderzoek bij welk hoofdstuk hoort (volgens de aanpak in fase 3). */
const EIGEN_ONDERZOEK: Record<number, { enquetes: string[]; interviews: boolean }> = {
  1: { enquetes: ["werknemers"], interviews: false },
  2: { enquetes: ["werknemers"], interviews: true },
  3: { enquetes: [], interviews: true },
  4: { enquetes: ["leerlingen", "docenten"], interviews: true },
  5: { enquetes: ["leerlingen", "docenten", "werknemers"], interviews: false },
};

/** Splitst een deelvraag in de vraag zelf en de subvragen (regels met een streepje). */
export function splitsDeelvraag(text: string): { vraag: string; sub: string[] } {
  const regels = text.split("\n").map((r) => r.trim()).filter(Boolean);
  const vraag = regels.find((r) => !/^[-•*]/.test(r)) ?? regels[0] ?? "";
  const sub = regels.filter((r) => /^[-•*]/.test(r)).map((r) => r.replace(/^[-•*]\s*/, ""));
  return { vraag, sub };
}

/**
 * Verdeelt de aantekeningen uit fase 4 over de hoofdstukken. Een alinea met "(deelvraag 3)"
 * gaat naar hoofdstuk 3; alinea's zonder label blijven over.
 */
export function verdeelKernpunten(tekst: string): { perDeelvraag: Record<number, string[]>; overig: string[] } {
  const perDeelvraag: Record<number, string[]> = {};
  const overig: string[] = [];
  for (const alinea of tekst.split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean)) {
    if (/^-{3}.*-{3}$/.test(alinea)) continue;
    const m = alinea.match(/\(deelvraag (\d+)\)/i);
    if (m) (perDeelvraag[Number(m[1])] ??= []).push(alinea.replace(/\s*\(deelvraag \d+\)/gi, "").trim());
    else overig.push(alinea);
  }
  return { perDeelvraag, overig };
}

export function deelvraagKey(sq: Pick<Subquestion, "id">, deel: string) {
  return `h:${sq.id}:${deel}`;
}

const join = (...parts: (string | undefined | null | false)[]) => parts.filter(Boolean).join("\n\n");

export function bouwVerslag(i: VerslagInput): Hoofdstuk[] {
  const vd = (n: number) => i.veldData[n] ?? {};
  const hoofdvraag = vd(2).hoofdvraag?.trim() ?? "";
  const deelvragen = [...i.deelvragen].sort((a, b) => a.order_index - b.order_index);
  const dvLijst = deelvragen.map((d, n) => `${n + 1}. ${splitsDeelvraag(d.text).vraag}`).join("\n");
  const kern = verdeelKernpunten(vd(4).kernpunten ?? "");
  const bronnen = [...i.bronnen].sort((a, b) => (a.authors || a.title).localeCompare(b.authors || b.title));

  const uit: Hoofdstuk[] = [];

  uit.push({
    key: "titelpagina",
    nummer: "",
    titel: "Titelpagina",
    uitleg: "Titel, ondertitel, je naam, school, klas en datum.",
    auto: [
      {
        titel: "Staat al vast",
        tekst: [
          `Naam: ${i.naam ?? "—"}`,
          "School: Maerlant-Lyceum",
          "Klas: 6 vwo",
          i.inleverdatum ? `Inleverdatum: ${fmtDate(i.inleverdatum)}` : null,
        ].filter(Boolean).join("\n"),
      },
    ],
    schrijven: [
      { key: "titel", label: "Titel", hint: "Een pakkende titel, bijvoorbeeld een korte versie van je hoofdvraag.", regels: 1 },
      { key: "ondertitel", label: "Ondertitel", hint: "Vaak de hoofdvraag zelf.", start: hoofdvraag, regels: 1 },
      { key: "begeleider", label: "Begeleider en vak", hint: "Naam van je begeleider en het vak.", regels: 1 },
    ],
  });

  uit.push({
    key: "inleiding",
    nummer: "",
    titel: "Inleiding",
    uitleg: "Introduceer het onderwerp, leg uit waarom je het koos en noem je hoofdvraag en deelvragen.",
    auto: [
      vd(1).waarom && { titel: "Waarom dit onderwerp (fase 1)", tekst: vd(1).waarom },
      vd(1).afbakening && { titel: "Afbakening (fase 1)", tekst: vd(1).afbakening },
      hoofdvraag && { titel: "Hoofdvraag (fase 2)", tekst: hoofdvraag },
      deelvragen.length > 0 && { titel: "Deelvragen", tekst: dvLijst },
      vd(3).aanpak && { titel: "Aanpak (fase 3)", tekst: vd(3).aanpak },
    ].filter((b): b is AutoBlok => !!b),
    schrijven: [
      {
        key: "inleiding_onderwerp",
        label: "Introductie van het onderwerp",
        hint: "Waar gaat je PWS over en waarom speelt het juist nu? Leg kort uit wat AI is.",
      },
      {
        key: "inleiding_motivatie",
        label: "Waarom ik dit onderwerp koos",
        hint: "Je persoonlijke motivatie. Je tekst uit fase 1 is een goed begin.",
        start: vd(1).waarom,
      },
      {
        key: "inleiding_vragen",
        label: "Hoofdvraag, deelvragen en opbouw",
        hint: "Noem je hoofdvraag en deelvragen en vertel kort welk hoofdstuk welke deelvraag beantwoordt.",
        start: join(hoofdvraag && `Hoofdvraag: ${hoofdvraag}`, deelvragen.length > 0 && `Deelvragen:\n${dvLijst}`),
      },
      {
        key: "inleiding_methode",
        label: "Hoe ik het heb onderzocht",
        hint: "Beschrijf stap voor stap wat je deed: welke bronnen, welke enquêtes (bij wie, hoeveel reacties) en welke interviews.",
        start: join(vd(3).eigen_onderzoek, vd(6).uitvoering),
      },
    ],
  });

  deelvragen.forEach((d, n) => {
    const nr = n + 1;
    const { vraag, sub } = splitsDeelvraag(d.text);
    const gekoppeld = bronnen.filter((b) => b.subquestion_id === d.id);
    const eigen = EIGEN_ONDERZOEK[nr];
    const auto: AutoBlok[] = [];

    for (const b of gekoppeld) {
      auto.push({
        titel: `Bron: ${b.title}`,
        tekst: b.summary?.trim() || "Nog geen samenvatting. Open de bron bij Bronnen en maak een samenvatting.",
        link: { href: "/bronnen", label: "Naar Bronnen" },
      });
    }
    for (const k of kern.perDeelvraag[nr] ?? []) auto.push({ titel: "Aantekening uit fase 4", tekst: k });
    if (nr === 1 && kern.overig.length) {
      auto.push({
        titel: "Aantekeningen uit fase 4 zonder deelvraag",
        tekst: `${kern.overig.join("\n\n")}\n\nTip: zet "(deelvraag 2)" achter een aantekening in fase 4, dan komt hij bij het goede hoofdstuk.`,
        link: i.faseIds[4] ? { href: `/fase/${i.faseIds[4]}`, label: "Naar fase 4" } : undefined,
      });
    }
    for (const e of i.enquetes.filter((e) => eigen?.enquetes.some((w) => e.title.toLowerCase().includes(w)))) {
      auto.push({
        titel: `Eigen onderzoek: ${e.title}`,
        tekst: `${e.reacties} reacties. Kies de uitkomsten die bij deze deelvraag horen en zet ze als grafiek met uitleg in dit hoofdstuk.`,
        link: { href: `/enquetes/${e.id}`, label: "Bekijk de resultaten" },
      });
    }
    if (eigen?.interviews) {
      auto.push({
        titel: "Eigen onderzoek: interviews",
        tekst: i.interviews.length
          ? `${i.interviews.length} afgerond interview(s). Vergelijk de antwoorden per thema en gebruik wat bij deze deelvraag past.`
          : "Nog geen afgeronde interviews.",
        link: { href: "/interviews/analyse", label: "Naar de vergelijking" },
      });
    }

    const paragrafen = sub.length ? sub : ["Tekst"];
    uit.push({
      key: `h:${d.id}`,
      nummer: String(nr),
      titel: vraag,
      uitleg: `Hoofdstuk ${nr} beantwoordt deelvraag ${nr}. Begin met een korte inleiding, schrijf per paragraaf en sluit af met een conclusie.`,
      auto,
      schrijven: [
        {
          key: deelvraagKey(d, "intro"),
          label: `Inleiding hoofdstuk ${nr}`,
          hint: "Noem de deelvraag en vertel hoe je het hoofdstuk hebt opgedeeld.",
        },
        ...paragrafen.map((p, j) => ({
          key: deelvraagKey(d, `p${j + 1}`),
          label: `${nr}.${j + 1} ${p}`,
          hint: "Gebruik je bronnen (met bronvermelding) en je eigen onderzoek.",
        })),
        {
          key: deelvraagKey(d, "conclusie"),
          label: `${nr}.${paragrafen.length + 1} Conclusie`,
          hint: `Beantwoord deelvraag ${nr} in een paar zinnen.`,
        },
      ],
      aandacht: gekoppeld.length ? undefined : ["Er is nog geen bron aan deze deelvraag gekoppeld."],
    });
  });

  const hNr = deelvragen.length;
  uit.push({
    key: "conclusie",
    nummer: String(hNr + 1),
    titel: "Conclusie",
    uitleg: "Herhaal je hoofdvraag en deelvragen en geef het antwoord, onderbouwd met je resultaten en bronnen.",
    auto: hoofdvraag ? [{ titel: "Hoofdvraag", tekst: hoofdvraag }] : [],
    verzamel: {
      titel: "Jouw conclusies per hoofdstuk",
      velden: deelvragen.map((d, n) => ({ label: `Hoofdstuk ${n + 1}`, key: deelvraagKey(d, "conclusie") })),
    },
    schrijven: [
      {
        key: "conclusie",
        label: "Antwoord op de hoofdvraag",
        hint: "Combineer de conclusies van je hoofdstukken tot één antwoord op je hoofdvraag. Klopte je hypothese?",
      },
    ],
  });

  uit.push({
    key: "reflectie",
    nummer: String(hNr + 2),
    titel: "Reflectie",
    uitleg: "Kijk terug op je onderzoek: wat ging goed, wat was lastig en hoe betrouwbaar zijn je resultaten?",
    auto: [vd(5).test && { titel: "Uit de proef van je enquêtes (fase 5)", tekst: vd(5).test }].filter(
      (b): b is AutoBlok => !!b,
    ),
    schrijven: [
      {
        key: "reflectie_proces",
        label: "Hoe ging het onderzoek?",
        hint: "Wat vond je leuk of moeilijk, wat ging anders dan gepland en wat heb je geleerd?",
      },
      {
        key: "discussie",
        label: "Betrouwbaarheid en wat ik anders zou doen",
        hint: "Hoe betrouwbaar zijn je bronnen, enquêtes (hoeveel reacties, van wie) en interviews? Wat zou je een volgende keer anders doen?",
      },
    ],
  });

  const zonderSamenvatting = bronnen.filter((b) => !b.summary?.trim()).length;
  const nogControleren = bronnen.filter((b) => /controleren/i.test(b.title)).length;
  uit.push({
    key: "bronnenlijst",
    nummer: String(hNr + 3),
    titel: "Gebruikte bronnen",
    uitleg: "Alle bronnen in APA-stijl, op alfabet. Dit maakt het systeem automatisch uit je bronnenlijst.",
    auto: [
      {
        titel: `${bronnen.length} bronnen (APA)`,
        tekst: bronnen.map(toApa).join("\n\n") || "Nog geen bronnen.",
        link: { href: "/bronnen", label: "Naar Bronnen" },
      },
    ],
    schrijven: [],
    aandacht: [
      zonderSamenvatting && `${zonderSamenvatting} bron(nen) hebben nog geen samenvatting.`,
      nogControleren && `${nogControleren} bron(nen) hebben een titel die je nog moet controleren.`,
    ].filter((x): x is string => !!x),
  });

  uit.push({
    key: "bijlage_onderzoeksplan",
    nummer: "Bijlage A",
    titel: "Onderzoeksplan",
    uitleg: "Je hoofdvraag, hypothese, deelvragen en aanpak.",
    bijlage: true,
    auto: [
      hoofdvraag && { titel: "Hoofdvraag", tekst: hoofdvraag },
      deelvragen.length > 0 && { titel: "Deelvragen", tekst: dvLijst },
      vd(3).aanpak && { titel: "Aanpak", tekst: vd(3).aanpak },
      vd(3).bronnenonderzoek && { titel: "Bronnenonderzoek", tekst: vd(3).bronnenonderzoek },
    ].filter((b): b is AutoBlok => !!b),
    schrijven: [
      {
        key: "hypothese",
        label: "Hypothese",
        hint: "Wat verwachtte je dat het antwoord op je hoofdvraag zou zijn, en waarom?",
      },
    ],
  });

  const minuten = i.logboek.reduce((s, l) => s + l.minutes, 0);
  const uren = (minuten / 60).toFixed(1).replace(".", ",");
  uit.push({
    key: "bijlage_logboek",
    nummer: "Bijlage B",
    titel: "Logboek",
    uitleg: `Wat je wanneer deed en hoe lang. Doel: ${LOGBOEK_DOEL_UREN} uur.`,
    bijlage: true,
    auto: [
      {
        titel: `${uren} van de ${LOGBOEK_DOEL_UREN} uur`,
        tekst:
          [...i.logboek]
            .sort((a, b) => a.log_date.localeCompare(b.log_date))
            .map((l) => `${fmtDate(l.log_date)} · ${Math.floor(l.minutes / 60)}u ${l.minutes % 60}m · ${l.activity}`)
            .join("\n") || "Nog niets in je logboek.",
        link: { href: "/logboek", label: "Naar Logboek" },
      },
    ],
    schrijven: [],
    aandacht: minuten < LOGBOEK_DOEL_UREN * 60 ? ["Houd je logboek bij tijdens het werk, niet achteraf."] : undefined,
  });

  uit.push({
    key: "bijlage_enquetes",
    nummer: "Bijlage C",
    titel: "Enquêtes",
    uitleg: "Je enquêtevragen (het meetinstrument) en het aantal reacties.",
    bijlage: true,
    auto: i.enquetes.map((e) => ({
      titel: e.title,
      tekst: `${e.vragen} vragen · ${e.reacties} reacties`,
      link: { href: `/enquetes/${e.id}`, label: "Bekijk enquête" },
    })),
    schrijven: [],
  });

  uit.push({
    key: "bijlage_interviewvragen",
    nummer: "Bijlage D",
    titel: "Interviewvragen",
    uitleg: "De vragen die je in je interviews stelde.",
    bijlage: true,
    auto: vd(5).instrument ? [{ titel: "Meetinstrument (fase 5)", tekst: vd(5).instrument }] : [],
    schrijven: [],
  });

  uit.push({
    key: "bijlage_interviews",
    nummer: "Bijlage E",
    titel: "Interviews",
    uitleg: "De uitgewerkte interviews. Afgeronde interviews uit de interviewmodule komen hier vanzelf.",
    bijlage: true,
    auto: i.interviews.map((iv) => ({
      titel: `${iv.label} · ${iv.type}`,
      tekst: iv.antwoorden.map((a) => `${a.vraag}\n${a.antwoord}`).join("\n\n"),
    })),
    schrijven: [],
    aandacht: i.interviews.length ? undefined : ["Nog geen afgeronde interviews."],
  });

  return uit;
}

export function woorden(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
