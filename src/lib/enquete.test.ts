import { describe, it, expect } from "vitest";
import {
  NIET_GETOOND,
  aantalZichtbaar,
  andersTeksten,
  filterReacties,
  naarLangeCsv,
  vergelijkCode,
  voldoet,
  vraagNummers,
  waardeVan,
  zichtbaar,
  naarCsv,
  naarIndienen,
  opschonen,
  optiesVoor,
  schaalVerdeling,
  stappen,
  telKeuzes,
  wisselKeuze,
  type Reactie,
  type Vraag,
} from "./enquete";

const v = (id: string, extra: Partial<Vraag>): Vraag => ({
  id,
  text: id,
  type: "meerkeuze",
  options: [],
  required: true,
  section: null,
  config: {},
  ...extra,
});

const fase = v("fase", { options: ["5 vwo", "Bachelor"] });
const profiel = v("profiel", {
  config: {
    afhankelijkVan: "fase",
    groepen: [
      { als: ["5 vwo"], opties: ["N&T", "E&M"] },
      { als: ["Bachelor"], opties: ["Recht", "Anders"] },
    ],
  },
});
const stellingen = v("st", { type: "stellingen", config: { items: ["a", "b", "c"], weetNiet: true } });
const gebruik = v("gebruik", {
  type: "meerdere",
  options: ["Uitleg", "Ideeën", "Programmeren", "Geen AI"],
  config: { max: 2, exclusief: ["Geen AI"] },
});

describe("optiesVoor", () => {
  it("toont opties die bij het eerdere antwoord passen", () => {
    expect(optiesVoor(profiel, { fase: ["5 vwo"] })).toEqual(["N&T", "E&M"]);
    expect(optiesVoor(profiel, { fase: ["Bachelor"] })).toEqual(["Recht", "Anders"]);
  });
  it("toont alle opties als er nog geen eerder antwoord is", () => {
    expect(optiesVoor(profiel, {})).toEqual(["N&T", "E&M", "Recht", "Anders"]);
  });
});

describe("stappen", () => {
  it("geeft elke stelling een eigen stap met hetzelfde vraagnummer", () => {
    const s = stappen([fase, stellingen, gebruik]);
    expect(s.map((x) => [x.vraag.id, x.nr, x.item])).toEqual([
      ["fase", 1, undefined],
      ["st", 2, 0],
      ["st", 2, 1],
      ["st", 2, 2],
      ["gebruik", 3, undefined],
    ]);
  });
});

describe("wisselKeuze", () => {
  it("respecteert het maximum", () => {
    let k = wisselKeuze([], "Uitleg", gebruik.config);
    k = wisselKeuze(k, "Ideeën", gebruik.config);
    k = wisselKeuze(k, "Programmeren", gebruik.config);
    expect(k).toEqual(["Uitleg", "Ideeën"]);
  });
  it("een exclusieve optie wist de rest en andersom", () => {
    expect(wisselKeuze(["Uitleg", "Ideeën"], "Geen AI", gebruik.config)).toEqual(["Geen AI"]);
    expect(wisselKeuze(["Geen AI"], "Uitleg", gebruik.config)).toEqual(["Uitleg"]);
  });
  it("zet een gekozen optie weer uit", () => {
    expect(wisselKeuze(["Uitleg"], "Uitleg", gebruik.config)).toEqual([]);
  });
});

describe("opschonen", () => {
  it("haalt een profiel weg dat niet meer bij de fase past", () => {
    expect(opschonen([fase, profiel], { fase: ["Bachelor"], profiel: ["N&T"] }).profiel).toEqual([]);
  });
});

describe("naarIndienen", () => {
  it("zet stellingen om naar losse antwoorden met item", () => {
    const uit = naarIndienen([stellingen, gebruik], { "st:0": ["4"], "st:2": ["weet ik niet"], gebruik: ["Uitleg", "Ideeën"] });
    expect(uit).toEqual([
      { question_id: "st", value: "4", item: 0 },
      { question_id: "st", value: "weet ik niet", item: 2 },
      { question_id: "gebruik", value: "Uitleg" },
      { question_id: "gebruik", value: "Ideeën" },
    ]);
  });
});

const reacties: Reactie[] = [
  { id: "1", created_at: "2026-10-17T10:00:00Z", answers: [
    { q: "gebruik", i: null, v: "Uitleg" }, { q: "gebruik", i: null, v: "Ideeën" },
    { q: "st", i: 0, v: "4" }, { q: "st", i: 1, v: "weet ik niet" },
  ] },
  { id: "2", created_at: "2026-10-17T11:00:00Z", answers: [
    { q: "gebruik", i: null, v: "Uitleg" },
    { q: "st", i: 0, v: "2" },
  ] },
  { id: "3", created_at: "2026-10-17T12:00:00Z", answers: [] },
];

describe("resultaten", () => {
  it("telt keuzes per invuller", () => {
    const { tellingen, beantwoord } = telKeuzes(gebruik, reacties);
    expect(beantwoord).toBe(2);
    expect(tellingen.find((t) => t.waarde === "Uitleg")?.n).toBe(2);
    expect(tellingen.find((t) => t.waarde === "Ideeën")?.n).toBe(1);
  });
  it("berekent verdeling en gemiddelde zonder 'weet ik niet'", () => {
    const d = schaalVerdeling(stellingen, reacties, 0);
    expect(d.counts).toEqual([0, 1, 0, 1, 0]);
    expect(d.gemiddelde).toBe(3);
    expect(schaalVerdeling(stellingen, reacties, 1).weetNiet).toBe(1);
  });
  it("maakt een CSV met één rij per invuller", () => {
    const csv = naarCsv([gebruik, stellingen], reacties).split("\r\n");
    expect(csv).toHaveLength(4);
    expect(csv[0]).toContain('"2.1 a"');
    expect(csv[1]).toContain('"Uitleg; Ideeën"');
  });
});

describe("vervolgvraag en anders", () => {
  const keuze = v("keuze", { options: ["Zeker niet", "Misschien", "Zeker wel"] });
  const welke = v("welke", { type: "open", required: false, config: { toonAls: { vraag: "keuze", waarden: ["Misschien", "Zeker wel"] } } });
  const onderwerp = v("ond", { type: "meerdere", options: ["AI gebruiken", "Anders"], config: { max: 3, andersTekst: true } });

  it("toont de vervolgvraag alleen bij de juiste antwoorden", () => {
    expect(stappen([keuze, welke, onderwerp], { keuze: ["Zeker niet"] }).map((s) => [s.vraag.id, s.nr])).toEqual([
      ["keuze", 1],
      ["ond", 2],
    ]);
    expect(stappen([keuze, welke, onderwerp], { keuze: ["Misschien"] }).map((s) => s.vraag.id)).toEqual(["keuze", "welke", "ond"]);
  });
  it("verstuurt geen antwoord op een verborgen vraag", () => {
    const a = opschonen([keuze, welke], { keuze: ["Zeker niet"], welke: ["Wiskunde D"] });
    expect(naarIndienen([keuze, welke], a)).toEqual([{ question_id: "keuze", value: "Zeker niet" }]);
  });
  it("voegt de eigen tekst bij Anders toe en telt die als Anders", () => {
    const uit = naarIndienen([onderwerp], { ond: ["AI gebruiken", "Anders"], "ond#anders": ["Filosofie"] });
    expect(uit.map((x) => x.value)).toEqual(["AI gebruiken", "Anders: Filosofie"]);
    const r: Reactie[] = [{ id: "1", created_at: "2026-10-17T10:00:00Z", answers: uit.map((x) => ({ q: x.question_id, i: null, v: x.value })) }];
    expect(telKeuzes(onderwerp, r).tellingen.find((t) => t.waarde === "Anders")?.n).toBe(1);
    expect(andersTeksten(onderwerp, r)).toEqual(["Filosofie"]);
  });
});

describe("docentenroute", () => {
  const type = v("type", { options: ["Vwo", "Universiteit", "Beide", "Anders"], config: { codes: ["vwo", "university", "both", "other"] } });
  const route = v("route", {
    options: ["Vwo", "Universiteit", "Geen van beide"],
    config: {
      codes: ["vwo", "university", "none"],
      vervolg: true,
      toonAls: { vraag: "type", waarden: ["both", "other"] },
      afhankelijkVan: "type",
      groepen: [
        { als: ["both"], opties: ["Vwo", "Universiteit"] },
        { als: ["other"], opties: ["Vwo", "Universiteit", "Geen van beide"] },
      ],
    },
  });
  const vwoRoute = [{ vraag: "type", waarden: ["vwo"] }, { vraag: "route", waarden: ["vwo"] }];
  const uniRoute = [{ vraag: "type", waarden: ["university"] }, { vraag: "route", waarden: ["university"] }];
  const algemeen = v("alg", { type: "open", required: false });
  const v1 = v("v1", { options: ["Ja"], config: { toonAls: vwoRoute } });
  const u1 = v("u1", { options: ["Ja"], config: { toonAls: uniRoute } });
  const vragen = [type, route, algemeen, v1, u1];
  const ids = (a: Record<string, string[]>) => stappen(vragen, a).map((s) => s.vraag.id);

  it("vwo-docent ziet de vwo-vragen", () => {
    expect(ids({ type: ["vwo"] })).toEqual(["type", "alg", "v1"]);
  });
  it("universitaire docent ziet de universiteitsvragen", () => {
    expect(ids({ type: ["university"] })).toEqual(["type", "alg", "u1"]);
  });
  it("bij 'Beide' volgt de route uit de vervolgvraag, zonder 'Geen van beide'", () => {
    expect(ids({ type: ["both"] })).toEqual(["type", "route", "alg"]);
    expect(optiesVoor(route, { type: ["both"] })).toEqual(["Vwo", "Universiteit"]);
    expect(ids({ type: ["both"], route: ["university"] })).toEqual(["type", "route", "alg", "u1"]);
  });
  it("bij 'Anders' + 'Geen van beide' alleen de algemene vragen", () => {
    expect(optiesVoor(route, { type: ["other"] })).toContain("Geen van beide");
    expect(ids({ type: ["other"], route: ["none"] })).toEqual(["type", "route", "alg"]);
  });
  it("een gewijzigde route stuurt geen verborgen antwoorden mee", () => {
    const a = opschonen(vragen, { type: ["vwo"], route: ["university"], v1: ["Ja"], u1: ["Ja"] });
    expect(naarIndienen(vragen, a).map((x) => x.question_id)).toEqual(["type", "v1"]);
  });
  it("de vervolgvraag krijgt geen eigen nummer", () => {
    expect(vraagNummers(vragen)).toEqual(["1", "1a", "2", "3", "4"]);
    expect(aantalZichtbaar(vragen, { type: ["both"], route: ["vwo"] })).toBe(3);
    expect(stappen(vragen, { type: ["both"], route: ["vwo"] }).map((s) => s.nr)).toEqual([1, 1, 2, 3]);
  });
  it("voldoet werkt met één of meer voorwaarden", () => {
    expect(voldoet(uniRoute, { route: ["university"] })).toBe(true);
    expect(voldoet({ vraag: "type", waarden: ["vwo"] }, { type: ["both"] })).toBe(false);
  });
  it("de export markeert vragen die de route verborg", () => {
    const r: Reactie[] = [{ id: "r1", created_at: "2026-10-17T10:00:00Z", answers: [{ q: "type", i: null, v: "vwo", ver: 1 }] }];
    const rij = naarCsv(vragen, r, "enq").split("\r\n")[1];
    expect(rij).toContain('"r1";"enq"');
    expect(rij).toContain(`"${NIET_GETOOND}"`);
    expect(zichtbaar(u1, { type: ["vwo"] })).toBe(false);
    const lang = naarLangeCsv(vragen, r, "enq").split("\r\n");
    expect(lang[1]).toBe('"r1";"enq";"2026-10-17T10:00:00Z";"type";"1";"1";"";"vwo"');
    expect(filterReacties(r, "type", "university")).toHaveLength(0);
  });
});

describe("antwoordcodes", () => {
  const vaard = v("vaard", {
    type: "meerdere",
    options: ["Creativiteit", "Rekenen / wiskunde", "Geen van deze vaardigheden", "Weet ik niet"],
    config: { codes: ["creativity", "mathematics", "none", "dont_know"], max: 3, exclusief: ["none", "dont_know"] },
  });
  const onderwerp = v("ond", {
    type: "meerdere",
    options: ["AI gebruiken", "Anders, namelijk..."],
    config: { codes: ["ai_usage", "other"], andersTekst: true, andersWaarde: "other" },
  });
  it("slaat de code op en toont het label", () => {
    expect(waardeVan(vaard, "Rekenen / wiskunde")).toBe("mathematics");
    const r: Reactie[] = [{ id: "1", created_at: "", answers: [{ q: "vaard", i: null, v: "mathematics" }] }];
    expect(telKeuzes(vaard, r).tellingen.find((t) => t.code === "mathematics")).toMatchObject({ waarde: "Rekenen / wiskunde", n: 1 });
  });
  it("twee exclusieve opties sluiten elkaar en de rest uit", () => {
    expect(wisselKeuze(["creativity"], "none", vaard.config)).toEqual(["none"]);
    expect(wisselKeuze(["none"], "dont_know", vaard.config)).toEqual(["dont_know"]);
  });
  it("koppelt labels van een enquête zonder codes aan dezelfde code", () => {
    const zonder = v("w", { type: "meerdere", options: ["Rekenen/wiskunde", "Psychologie/gedrag"] });
    expect(vergelijkCode(zonder, "Rekenen/wiskunde")).toBe("mathematics");
    expect(vergelijkCode(zonder, "Psychologie/gedrag")).toBe("psychology");
  });
  it("'Anders' met eigen tekst gebruikt de eigen code", () => {
    const uit = naarIndienen([onderwerp], { ond: ["other"], "ond#anders": ["Filosofie"] });
    expect(uit[0].value).toBe("other: Filosofie");
    const r: Reactie[] = [{ id: "1", created_at: "", answers: [{ q: "ond", i: null, v: "other: Filosofie" }] }];
    expect(telKeuzes(onderwerp, r).tellingen.find((t) => t.code === "other")?.n).toBe(1);
    expect(andersTeksten(onderwerp, r)).toEqual(["Filosofie"]);
  });
});
