import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { vergelijkDocx, vergelijkPdf, verslagDocx, verslagPdf, type ExportData } from "./interviewExport";
import type { IvUitnodiging } from "./interview";

const u = (id: string, naamVermelden: boolean): IvUitnodiging => ({
  id, type_id: null, type_naam: "HR-manager", naam: `Zoë ${id}`, email: `${id}@voorbeeld.nl`, functie: "HR-adviseur",
  organisatie: "Bedrijf €", boodschap: null, aanspreekvorm: "u", intro: null, status: "afgerond", gearchiveerd: false,
  toestemming: { deelname: true, naam_vermelden: naamVermelden, citeren: false, ai: false, gegeven_op: "2026-10-18T10:00:00Z" },
  uitgenodigd_op: null, laatste_activiteit: null, afgerond_op: "2026-10-18T11:00:00Z", bewaren_tot: null, created_at: `2026-10-18T09:0${id}:00Z`,
  vragen: [{ key: "alg_1", tekst: "Wat verandert er door AI?", toelichting: null, verplicht: true, vraagtype: "open", themas: ["huidig_werk"], algemeen: true }],
});

const data = (anoniem: boolean): ExportData => ({
  uitnodigingen: [u("1", true), u("2", false)],
  antwoorden: [
    { uitnodiging_id: "1", vraag_key: "alg_1", antwoord: "Veel – échte “creatieve” taken blijven. 🤖\n\nTweede alinea.", bijgewerkt_op: "" },
    { uitnodiging_id: "2", vraag_key: "alg_1", antwoord: "Een héél lang woord: " + "x".repeat(300), bijgewerkt_op: "" },
  ],
  themas: [{ key: "huidig_werk", naam: "Huidige invloed", beschrijving: null, order_index: 1 }],
  nummers: new Map([["1", 1], ["2", 2]]),
  anoniem,
});

describe("exports", () => {
  it("maakt een leesbare PDF met Nederlandse tekens en lange woorden", async () => {
    const pdf = await verslagPdf(data(false));
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(2);
    expect((await vergelijkPdf(data(true))).length).toBeGreaterThan(1000);
  });

  it("maakt Word-bestanden zonder e-mailadressen", async () => {
    for (const bestand of [await verslagDocx(data(false)), await vergelijkDocx(data(true))]) {
      expect(Buffer.from(bestand.slice(0, 2)).toString()).toBe("PK");
      const { default: JSZip } = await import("jszip");
      const xml = await (await JSZip.loadAsync(bestand)).file("word/document.xml")!.async("string");
      expect(xml).not.toContain("@voorbeeld.nl");
      expect(xml.toLowerCase()).toContain("niet letterlijk citeren");
    }
  });

  it("noemt geen naam zonder toestemming of in een anonieme export", async () => {
    const { default: JSZip } = await import("jszip");
    const xml = async (anoniem: boolean) =>
      (await (await JSZip.loadAsync(await verslagDocx(data(anoniem)))).file("word/document.xml")!.async("string"));
    const gewoon = await xml(false);
    expect(gewoon).toContain("Zoë 1");
    expect(gewoon).not.toContain("Zoë 2");
    expect(gewoon).toContain("Respondent 2 (HR-manager)");
    const anoniem = await xml(true);
    expect(anoniem).not.toContain("Zoë");
    expect(anoniem).not.toContain("Bedrijf");
  });
});
