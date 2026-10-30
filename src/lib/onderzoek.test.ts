import { describe, expect, it } from "vitest";
import { controleerAntwoorden, isEchteEnquete, vraagRefs, vraagSamenvatting, type OnderzoekEnquete } from "./onderzoek";
import type { Vraag } from "./enquete";

const vraag: Vraag = { id: "q1", text: "Gebruik je AI?", type: "meerkeuze", options: ["Ja", "Nee"], required: true, section: null, config: {} };
const enquete: OnderzoekEnquete = {
  id: "s1",
  title: "AI – leerlingen",
  vragen: [vraag],
  reacties: [
    { id: "r1", created_at: "", answers: [{ q: "q1", i: null, v: "Ja" }] },
    { id: "r2", created_at: "", answers: [{ q: "q1", i: null, v: "Ja" }] },
    { id: "r3", created_at: "", answers: [{ q: "q1", i: null, v: "Nee" }] },
  ],
};

describe("onderzoek", () => {
  it("laat oude en voorbeeldenquêtes weg", () => {
    expect(isEchteEnquete("Oud – AI en werk")).toBe(false);
    expect(isEchteEnquete("Werknemers data 2")).toBe(false);
    expect(isEchteEnquete("AI en de toekomst van werk – werknemers")).toBe(true);
  });

  it("vat een keuzevraag samen met uitgerekende cijfers", () => {
    expect(vraagSamenvatting(vraag, enquete.reacties)).toBe("3 invullers: Ja 2 (67%), Nee 1 (33%)");
  });

  it("houdt alleen bestaande grafieken over en vult ontbrekende deelvragen aan", () => {
    const refs = vraagRefs([enquete]);
    expect(refs[0].code).toBe("E1-V1");
    const uit = controleerAntwoorden(
      {
        deelvragen: [{ nummer: 1, antwoord: "x", onderbouwing: ["a"], grafieken: [{ code: "E1-V1", waarom: "w" }, { code: "E9-V9", waarom: "?" }, { code: "E1-V1", waarom: "dubbel" }] }],
        hoofdvraag: { antwoord: "h" },
      },
      refs,
      2,
    );
    expect(uit.deelvragen).toHaveLength(2);
    expect(uit.deelvragen[0].grafieken).toEqual([{ code: "E1-V1", waarom: "w" }]);
    expect(uit.deelvragen[1].antwoord).toBe("");
    expect(uit.hoofdvraag.antwoord).toBe("h");
  });
});

describe("grafieken voor Word", () => {
  it("maakt staven met aantallen en percentages", async () => {
    const { enkelHtml, vergelijkHtml } = await import("./grafiekHtml");
    const html = enkelHtml(vraag, enquete.reacties);
    expect(html).toContain("2 (67%)");
    expect(html).toContain('width="67%"');
    const v = vergelijkHtml([
      { naam: "leerlingen", kleur: "#2a78d6", vraag, reacties: enquete.reacties },
      { naam: "docenten", kleur: "#eb6834", vraag, reacties: enquete.reacties.slice(0, 1) },
    ]);
    expect(v).toContain("leerlingen (n = 3)");
    expect(v).toContain("1 (100%)");
    expect(v).toContain('font-weight:bold;padding-top:4pt">Ja<');
  });
});
