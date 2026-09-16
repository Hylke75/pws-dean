import Anthropic from "@anthropic-ai/sdk";
import type { AiFeedbackData } from "@/lib/types";

const FEEDBACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      enum: ["klaar", "bijna", "nog_niet"],
      description: "klaar = voldoet aan de eisen, bijna = grotendeels goed maar iets ontbreekt, nog_niet = belangrijke onderdelen missen nog",
    },
    samenvatting: {
      type: "string",
      description: "Eén à twee zinnen: hoe staat deze fase ervoor?",
    },
    sterke_punten: {
      type: "array",
      items: { type: "string" },
      description: "Wat is al goed. Concreet, 1–4 punten.",
    },
    aandachtspunten: {
      type: "array",
      items: { type: "string" },
      description: "Wat mist of kan beter, met een concrete tip per punt. 1–5 punten.",
    },
    volgende_stap: {
      type: "string",
      description: "De belangrijkste eerstvolgende actie voor de leerling.",
    },
  },
  required: ["verdict", "samenvatting", "sterke_punten", "aandachtspunten", "volgende_stap"],
} as const;

export type FeedbackInput = {
  faseTitel: string;
  faseNummer: number;
  faseOmschrijving: string | null;
  criteria: string[];
  velden: { label: string; waarde: string }[];
  uitwerking: string;
  materiaal: string[];
  bronnen: string[];
};

export function aiBeschikbaar(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function getPhaseFeedback(input: FeedbackInput): Promise<AiFeedbackData> {
  const client = new Anthropic(); // leest ANTHROPIC_API_KEY uit env

  const system = `Je bent een ervaren, vriendelijke PWS-begeleider op een Nederlandse middelbare school (havo/vwo). Je geeft een leerling gerichte, opbouwende feedback op één fase van het profielwerkstuk. Beoordeel de uitwerking tegen de gegeven beoordelingscriteria van díe fase. Wees eerlijk maar bemoedigend, schrijf in het Nederlands, op het niveau van een 5/6-klasser. Geef concrete, uitvoerbare tips — geen vaag advies. Verzin geen inhoud die de leerling niet heeft aangeleverd; als er (bijna) niets is ingevuld, zeg dat het nog te leeg is om goed te beoordelen en benoem wat er als eerste in moet.

Antwoord UITSLUITEND met één geldig JSON-object, zonder omliggende tekst of code-blokken, met exact deze velden:
{"verdict": "klaar" | "bijna" | "nog_niet", "samenvatting": string, "sterke_punten": string[], "aandachtspunten": string[], "volgende_stap": string}`;

  const bronnenTekst = input.bronnen.length ? input.bronnen.map((b) => `- ${b}`).join("\n") : "(geen bronnen toegevoegd)";
  const materiaalTekst = input.materiaal.length ? input.materiaal.map((m) => `- ${m}`).join("\n") : "(geen bijlagen of links toegevoegd)";
  const criteriaTekst = input.criteria.length ? input.criteria.map((c) => `- ${c}`).join("\n") : "(geen criteria)";
  const ingevuld = input.velden.filter((v) => v.waarde.trim());
  const veldenTekst = ingevuld.length
    ? ingevuld.map((v) => `### ${v.label}\n${v.waarde.trim()}`).join("\n\n")
    : "(geen velden ingevuld)";

  const user = `Fase ${input.faseNummer}: ${input.faseTitel}

Doel van deze fase:
${input.faseOmschrijving ?? "(geen omschrijving)"}

Beoordelingscriteria voor deze fase:
${criteriaTekst}

--- Ingevulde velden van de leerling ---
${veldenTekst}

--- Extra aantekeningen ---
${input.uitwerking.trim() || "(geen)"}

Toegevoegd materiaal / bijlagen:
${materiaalTekst}

Toegevoegde bronnen:
${bronnenTekst}

Beoordeel deze fase tegen de criteria en geef je feedback.`;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    system,
    output_config: { format: { type: "json_schema", schema: FEEDBACK_SCHEMA } },
    messages: [{ role: "user", content: user }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Geen tekst in AI-antwoord");
  }
  // Ontdoe van eventuele code-fences en pak het JSON-object.
  let raw = textBlock.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  return JSON.parse(raw) as AiFeedbackData;
}
