import { describe, expect, it } from "vitest";
import { weekMail, type WeekGegevens } from "./weekoverzicht";

const g: WeekGegevens = {
  minuten_totaal: 180,
  minuten_week: 0,
  geschreven: ["titel"],
  deelvragen: [{ id: "a", text: "Vraag?\n- een\n- twee", order_index: 1 }],
  volgende_deadline: { titel: "Resultaten verwerken", deadline: "2026-11-15" },
  einddatum: "2026-12-23",
  interviews_open: 2,
  interviews_afgerond: 3,
  enquetes: [{ titel: "AI – werknemers", totaal: 35, week: 4 }],
};

describe("weekMail", () => {
  it("vat de stand samen en noemt wat er deze week geschreven moet worden", () => {
    const { onderwerp, html } = weekMail(g, "Dean Luijk", new Date("2026-11-02T08:00:00"));
    expect(html).toContain("Hoi Dean,");
    expect(html).toContain("<strong>3,0</strong> van de 40 uur");
    expect(html).toContain("vorige week niets bijgeschreven");
    expect(html).toContain("<strong>1</strong> van de 15 stukken geschreven");
    expect(html).toContain("<strong>2</strong> uitgenodigd maar nog niet ingevuld");
    expect(html).toContain("werknemers: 35 (+4)");
    expect(html).toContain("<li>Ondertitel</li>");
    expect(onderwerp).toMatch(/stukken schrijven$/);
  });
});
