import { describe, it, expect } from "vitest";
import { toApa } from "./apa";
import type { Source } from "./types";

function bron(overrides: Partial<Source>): Source {
  return {
    id: "1",
    source_type: "website",
    authors: null,
    title: "Titel",
    year: null,
    publisher: null,
    url: null,
    accessed_on: null,
    notes: null,
    summary: null,
    quotes: null,
    reliability: null,
    relevance: null,
    phase_id: null,
    created_at: "2026-01-01",
    ...overrides,
  };
}

describe("toApa", () => {
  it("boek: auteur (jaar). titel. uitgever.", () => {
    expect(
      toApa(bron({ source_type: "boek", authors: "Jansen, P.", year: "2020", title: "Slaap goed", publisher: "Boom" })),
    ).toBe("Jansen, P. (2020). Slaap goed. Boom.");
  });

  it("website met url en raadpleegdatum", () => {
    const s = toApa(
      bron({ source_type: "website", authors: "NRC", year: "2021", title: "Schermtijd", publisher: "NRC.nl", url: "https://nrc.nl/x", accessed_on: "2021-03-05" }),
    );
    expect(s).toContain("NRC. (2021). Schermtijd. NRC.nl.");
    expect(s).toContain("Geraadpleegd op 5 mrt 2021, van https://nrc.nl/x");
  });

  it("gebruikt z.d. als er geen jaar is", () => {
    expect(toApa(bron({ title: "Naamloos" }))).toContain("(z.d.).");
  });

  it("video krijgt [Video]-markering", () => {
    expect(toApa(bron({ source_type: "video", title: "Uitleg slaap", publisher: "YouTube", url: "https://y/z" }))).toContain("[Video]");
  });

  it("interview wordt persoonlijke communicatie", () => {
    expect(toApa(bron({ source_type: "interview", authors: "H. de Vries", accessed_on: "2026-10-01" }))).toContain("Persoonlijke communicatie");
  });
});
