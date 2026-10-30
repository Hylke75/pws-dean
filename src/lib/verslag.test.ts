import { describe, expect, it } from "vitest";
import { bouwVerslag, splitsDeelvraag, verdeelKernpunten, type VerslagInput } from "./verslag";

const basis: VerslagInput = {
  veldData: { 2: { hoofdvraag: "Sluit het vwo aan?" }, 4: { kernpunten: "Algemeen punt\n\nWEF: vaardigheden. (deelvraag 2)\n\n--- Aanvullend ---" } },
  deelvragen: [
    { id: "a", order_index: 1, text: "Hoe verandert de arbeidsmarkt?\n- Vroeger\n- Nu", created_at: "" },
    { id: "b", order_index: 2, text: "Welke vaardigheden?", created_at: "" },
  ],
  bronnen: [],
  logboek: [],
  enquetes: [{ id: "e1", title: "AI – werknemers", reacties: 31, vragen: 20 }],
  interviews: [],
  naam: "Dean",
  inleverdatum: null,
  faseIds: {},
};

describe("verslag", () => {
  it("splitst een deelvraag in vraag en subvragen", () => {
    expect(splitsDeelvraag("Vraag?\n- een\n- twee")).toEqual({ vraag: "Vraag?", sub: ["een", "twee"] });
  });

  it("verdeelt aantekeningen uit fase 4 over de deelvragen", () => {
    const k = verdeelKernpunten(basis.veldData[4].kernpunten);
    expect(k.perDeelvraag[2]).toEqual(["WEF: vaardigheden."]);
    expect(k.overig).toEqual(["Algemeen punt"]);
  });

  it("maakt per deelvraag een hoofdstuk met paragrafen en conclusie", () => {
    const h = bouwVerslag(basis);
    const h1 = h.find((x) => x.key === "h:a")!;
    expect(h1.nummer).toBe("1");
    expect(h1.schrijven.map((f) => f.label)).toEqual(["Inleiding hoofdstuk 1", "1.1 Vroeger", "1.2 Nu", "1.3 Conclusie"]);
    expect(h1.auto.some((b) => b.titel.includes("werknemers"))).toBe(true);
    const h2 = h.find((x) => x.key === "h:b")!;
    expect(h2.schrijven.map((f) => f.label)).toEqual(["Inleiding hoofdstuk 2", "2.1 Tekst", "2.2 Conclusie"]);
    expect(h2.auto.map((b) => b.tekst)).toContain("WEF: vaardigheden.");
    expect(h.find((x) => x.key === "conclusie")!.nummer).toBe("3");
  });
});

describe("schrijfTempo", () => {
  it("verdeelt de open stukken over de resterende weken", async () => {
    const { schrijfTempo } = await import("./verslag");
    expect(schrijfTempo(35, "2026-12-23", new Date("2026-10-30T12:00:00"))).toEqual({ weken: 8, perWeek: 5 });
    expect(schrijfTempo(3, "2026-10-31", new Date("2026-10-30T12:00:00"))).toEqual({ weken: 1, perWeek: 3 });
    expect(schrijfTempo(4, "2026-10-01", new Date("2026-10-30T12:00:00"))).toEqual({ weken: 0, perWeek: 4 });
    expect(schrijfTempo(4, null, new Date())).toBeNull();
  });
});
