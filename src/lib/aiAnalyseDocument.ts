import Anthropic from "@anthropic-ai/sdk";

/** Samenvatting van een aangeleverd document met een analyse (eigen of door anderen), voor gebruik in de onderzoeksanalyse. */

export type AnalyseDocumentInput = {
  titel: string;
  soort: "eigen" | "extern";
  auteur: string | null;
  jaar: string | null;
  hoofdvraag: string;
  deelvraag: string | null;
  /** PDF als base64, of platte tekst (Word, CSV, tekst) */
  inhoud: { pdf: string } | { tekst: string };
};

export async function getAnalyseSamenvatting(i: AnalyseDocumentInput): Promise<string> {
  const client = new Anthropic();
  const wie =
    i.soort === "eigen"
      ? "Dit is een analyse die Dean zelf heeft gemaakt (eigen onderzoek)."
      : `Dit is een analyse door anderen${i.auteur ? `: ${i.auteur}` : ""}${i.jaar ? ` (${i.jaar})` : ""}.`;

  const system = `Je helpt Dean (6 vwo) met zijn profielwerkstuk over AI en de arbeidsmarkt. Je vat een aangeleverd document met een analyse samen, zodat de uitkomsten later gebruikt kunnen worden om zijn onderzoeksvragen te beantwoorden.

Schrijf in helder Nederlands, zonder spelfouten, als platte tekst zonder kopjes of opmaaktekens:
- Eerst één zin: wat voor analyse het is, van wie, over welke groep (met aantallen als die erin staan) en welke methode.
- Daarna de belangrijkste uitkomsten, elk op een eigen regel die begint met "- ", met de cijfers precies zoals ze in het document staan.
- Sluit af met een regel die begint met "Let op:" over beperkingen (kleine groep, niet onafhankelijk, oud, buitenland) als die er zijn.
Gebruik UITSLUITEND wat in het document staat. Verzin niets. Is het document onleesbaar of leeg, zeg dat dan kort.`;

  const vraag = `${wie}\nTitel: ${i.titel}\nHoofdvraag van het PWS: ${i.hoofdvraag || "(onbekend)"}${
    i.deelvraag ? `\nHet document hoort bij de deelvraag: ${i.deelvraag}` : ""
  }\n\nVat dit document samen.`;

  const content: Anthropic.ContentBlockParam[] =
    "pdf" in i.inhoud
      ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: i.inhoud.pdf } }, { type: "text", text: vraag }]
      : [{ type: "text", text: `${vraag}\n\n--- Inhoud van het document (kan ingekort zijn) ---\n${i.inhoud.tekst.slice(0, 60000)}` }];

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  const blok = response.content.find((b) => b.type === "text");
  if (!blok || blok.type !== "text") throw new Error("Geen tekst in AI-antwoord");
  return blok.text.trim();
}
