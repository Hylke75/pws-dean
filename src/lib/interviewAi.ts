import Anthropic from "@anthropic-ai/sdk";
import type { AiAnalyse } from "./interview";

export const IV_AI_MODEL = "claude-opus-5-5";

const BRON = {
  type: "object",
  additionalProperties: false,
  properties: {
    respondent: { type: "string", description: "Pseudoniem, bijvoorbeeld R2" },
    vraag_key: { type: "string", description: "De vraag-ID waar dit punt op steunt" },
  },
  required: ["respondent", "vraag_key"],
} as const;

const PUNT = {
  type: "object",
  additionalProperties: false,
  properties: {
    tekst: { type: "string" },
    bronnen: { type: "array", items: BRON, description: "Minstens één bron: welke respondent zei dit bij welke vraag" },
  },
  required: ["tekst", "bronnen"],
} as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    samenvatting: { type: "string", description: "Neutrale samenvatting in 3 tot 6 zinnen" },
    themas: { type: "array", items: PUNT, description: "Terugkerende onderwerpen" },
    overeenkomsten: { type: "array", items: PUNT },
    verschillen: { type: "array", items: PUNT, description: "Verschillen tussen respondenten of typen respondenten" },
    citaten: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          respondent: { type: "string" },
          vraag_key: { type: "string" },
          citaat: { type: "string", description: "Exact overgenomen tekst uit het antwoord, maximaal twee zinnen" },
        },
        required: ["respondent", "vraag_key", "citaat"],
      },
    },
    vervolgvragen: { type: "array", items: { type: "string" }, description: "Mogelijke vervolgvragen voor Dean" },
  },
  required: ["samenvatting", "themas", "overeenkomsten", "verschillen", "citaten", "vervolgvragen"],
} as const;

export type AiInvoerRespondent = {
  pseudoniem: string;
  type_naam: string;
  magCiteren: boolean;
  antwoorden: { vraag_key: string; vraag: string; antwoord: string }[];
};

const SYSTEEM = `Je helpt Dean, een vwo-leerling, bij het analyseren van interviews voor zijn profielwerkstuk over AI en werk. Je krijgt antwoorden van respondenten, aangeduid met pseudoniemen (R1, R2, ...).

Regels:
- Gebruik uitsluitend wat in de antwoorden staat. Voeg geen kennis, cijfers of meningen van buiten toe.
- Elk punt bij thema's, overeenkomsten en verschillen krijgt minstens één bron (pseudoniem + vraag-ID) waar het echt op steunt.
- Citaten neem je letterlijk en exact over uit één antwoord, zonder iets te veranderen, in te korten met '...' of te vertalen. Citeer alleen respondenten die als 'mag geciteerd worden' zijn gemarkeerd.
- Geef geen namen of organisaties, ook als die in een antwoord voorkomen.
- Wees neutraal en voorzichtig: zeg 'een respondent' of 'twee respondenten', niet 'de meeste mensen'.
- Schrijf in helder Nederlands op vwo-niveau.`;

export async function maakInterviewAnalyse(themaNaam: string, respondenten: AiInvoerRespondent[]): Promise<AiAnalyse> {
  const client = new Anthropic(); // leest ANTHROPIC_API_KEY uit env

  const blokken = respondenten.map((r) => {
    const kop = `## ${r.pseudoniem} (${r.type_naam}) – ${r.magCiteren ? "mag geciteerd worden" : "NIET citeren"}`;
    const qa = r.antwoorden.map((a) => `[${a.vraag_key}] ${a.vraag}\n${a.antwoord}`).join("\n\n");
    return `${kop}\n\n${qa}`;
  });
  const user = `Thema: ${themaNaam}\n\nAnalyseer de antwoorden hieronder voor dit thema.\n\n${blokken.join("\n\n---\n\n")}`;

  const stream = client.messages.stream({
    model: IV_AI_MODEL,
    max_tokens: 8000,
    system: SYSTEEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: user }],
  } as Anthropic.MessageStreamParams);
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") throw new Error("De AI wilde deze analyse niet maken.");
  if (response.stop_reason === "max_tokens") throw new Error("De analyse werd te lang. Kies minder respondenten.");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Geen tekst in AI-antwoord");
  return JSON.parse(textBlock.text) as AiAnalyse;
}
