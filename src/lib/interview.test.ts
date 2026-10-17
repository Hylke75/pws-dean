import { describe, it, expect } from "vitest";
import {
  controleerAiAnalyse,
  geschatteMinuten,
  interviewsNaarCsv,
  pdfVeilig,
  respondentNummers,
  vergelijkPerThema,
  weergave,
  ZONDER_THEMA,
  type IvAntwoord,
  type IvUitnodiging,
  type IvVraag,
} from "./interview";

const vraag = (key: string, tekst: string, themas: string[]): IvVraag => ({
  key, tekst, toelichting: null, verplicht: false, vraagtype: "open", themas, algemeen: key.startsWith("alg_"),
});

const uitnodiging = (id: string, extra: Partial<IvUitnodiging>): IvUitnodiging => ({
  id, type_id: null, type_naam: "AI-specialist", naam: `Naam ${id}`, email: `${id}@voorbeeld.nl`, functie: "Onderzoeker",
  organisatie: "Org", boodschap: null, aanspreekvorm: "u", intro: null, status: "afgerond", gearchiveerd: false,
  toestemming: { deelname: true, naam_vermelden: true, citeren: true, ai: true, gegeven_op: "2026-10-18T10:00:00Z" },
  uitgenodigd_op: null, laatste_activiteit: null, afgerond_op: "2026-10-18T11:00:00Z", bewaren_tot: null,
  created_at: "2026-10-18T09:00:00Z",
  vragen: [vraag("alg_1", "Welke invloed heeft AI volgens u?", ["huidig_werk"]), vraag("ai_5", "Als u 17 was…", [])],
  ...extra,
});

const a = uitnodiging("a", {});
const b = uitnodiging("b", {
  created_at: "2026-10-18T09:30:00Z",
  type_naam: "Student of starter",
  aanspreekvorm: "je",
  toestemming: { deelname: true, naam_vermelden: false, citeren: false, ai: false, gegeven_op: "x" },
  vragen: [vraag("alg_1", "Welke invloed heeft AI volgens jou?", ["huidig_werk"])],
});
const antwoorden: IvAntwoord[] = [
  { uitnodiging_id: "a", vraag_key: "alg_1", antwoord: "AI versnelt het schrijfwerk enorm.", bijgewerkt_op: "" },
  { uitnodiging_id: "a", vraag_key: "ai_5", antwoord: "Ik zou informatica kiezen.", bijgewerkt_op: "" },
  { uitnodiging_id: "b", vraag_key: "alg_1", antwoord: "Ik merk het vooral bij\nhuiswerk.", bijgewerkt_op: "" },
];

describe("privacy", () => {
  const nrs = respondentNummers([b, a]);
  it("nummert op volgorde van aanmaken", () => {
    expect(nrs.get("a")).toBe(1);
    expect(nrs.get("b")).toBe(2);
  });
  it("toont naam alleen met toestemming en niet in een anonieme export", () => {
    expect(weergave(a, 1, false)).toMatchObject({ label: "Naam a", organisatie: "Org" });
    expect(weergave(a, 1, true)).toMatchObject({ label: "Respondent 1 (AI-specialist)", organisatie: null, functie: null });
    expect(weergave(b, 2, false)).toMatchObject({ label: "Respondent 2 (Student of starter)", naam: null, magCiteren: false });
  });
  it("de CSV respecteert privacykeuzes en bevat nooit e-mailadressen", () => {
    const tekst = interviewsNaarCsv([a, b], antwoorden, [{ key: "huidig_werk", naam: "Huidig werk", beschrijving: null, order_index: 1 }], nrs, false);
    expect(tekst).toContain('"Naam a"');
    expect(tekst).not.toContain("Naam b");
    expect(tekst).not.toContain("@voorbeeld.nl");
    expect(tekst).toContain('"Welke invloed heeft AI volgens jou?"');
    expect(tekst).toContain('"Huidig werk"');
    const anoniem = interviewsNaarCsv([a, b], antwoorden, [], nrs, true);
    expect(anoniem).not.toContain("Naam a");
    expect(anoniem).not.toContain('"Org"');
  });
});

describe("vergelijking", () => {
  it("zet algemene vragen van verschillende typen in één rij", () => {
    const rijen = vergelijkPerThema([a, b], antwoorden, "huidig_werk");
    expect(rijen).toHaveLength(1);
    expect(rijen[0].antwoorden.map((x) => x.uitnodiging_id)).toEqual(["a", "b"]);
    expect(rijen[0].antwoorden[1].tekst).toBe("Welke invloed heeft AI volgens jou?");
  });
  it("vragen zonder thema staan apart", () => {
    expect(vergelijkPerThema([a, b], antwoorden, ZONDER_THEMA).map((r) => r.key)).toEqual(["ai_5"]);
  });
});

describe("controle AI-analyse", () => {
  const bronnen = new Map([
    ["R1", new Map([["alg_1", "AI versnelt het schrijfwerk  enorm."]])],
    ["R2", new Map([["alg_1", "Ik merk het vooral bij huiswerk."]])],
  ]);
  it("laat alleen letterlijke citaten en herleidbare punten door", () => {
    const { analyse, verwijderd } = controleerAiAnalyse(
      {
        samenvatting: "Samenvatting",
        themas: [{ tekst: "Snelheid", bronnen: [{ respondent: "R1", vraag_key: "alg_1" }] }],
        overeenkomsten: [{ tekst: "Verzonnen", bronnen: [{ respondent: "R9", vraag_key: "alg_1" }] }],
        verschillen: [],
        citaten: [
          { respondent: "R1", vraag_key: "alg_1", citaat: "versnelt het schrijfwerk enorm" },
          { respondent: "R2", vraag_key: "alg_1", citaat: "AI is geweldig" },
        ],
        vervolgvragen: ["Hoe precies?"],
      },
      bronnen,
    );
    expect(analyse.themas).toHaveLength(1);
    expect(analyse.overeenkomsten).toHaveLength(0);
    expect(analyse.citaten.map((c) => c.respondent)).toEqual(["R1"]);
    expect(verwijderd).toBe(2);
  });
});

describe("hulpjes", () => {
  it("schat de invultijd", () => {
    expect(geschatteMinuten(11)).toBe(30);
    expect(geschatteMinuten(1)).toBe(5);
  });
  it("behoudt Nederlandse tekens in de PDF", () => {
    const kan = (t: string) => t.charCodeAt(0) < 256 || "‘’“”–—…€".includes(t);
    expect(pdfVeilig("Creëren, één, café – ‘ja’ 😀", kan)).toBe("Creëren, één, café – ‘ja’ ?");
    expect(pdfVeilig("a‑b", kan)).toBe("a-b");
  });
});
