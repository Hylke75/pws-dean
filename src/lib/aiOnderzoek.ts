import Anthropic from "@anthropic-ai/sdk";
import { splitsDeelvraag } from "@/lib/verslag";
import { bronnenVoorAi, controleerAntwoorden, dataVoorAi, vraagRefs, type OnderzoeksAntwoorden } from "@/lib/onderzoek";
import type { OnderzoekData } from "@/lib/onderzoekData";

export const ONDERZOEK_MODEL = "claude-opus-4-8";

const ANTWOORD = {
  type: "object",
  additionalProperties: false,
  properties: {
    antwoord: { type: "string", description: "Het antwoord in 3 tot 6 zinnen, gebaseerd op de data." },
    onderbouwing: { type: "array", items: { type: "string" }, description: "2 tot 5 concrete uitkomsten met cijfers uit de data en de vraagcode, bijv. '62% van de leerlingen (n = 41) … [E1-V7]'." },
    grafieken: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { code: { type: "string" }, waarom: { type: "string" } },
        required: ["code", "waarom"],
      },
    },
    interviews: { type: "string", description: "Wat de interviews hierover zeggen, of leeg als er niets over is." },
    bronnen: { type: "string", description: "Wat Deans bronnen hierover zeggen, in 2 tot 5 zinnen met bronvermelding in de tekst, bijv. (UWV, 2025). Leeg als er geen passende bron is." },
    beperkingen: { type: "string", description: "Hoe stevig is dit antwoord? Noem aantallen, ontbrekende data en wat Dean nog moet uitzoeken." },
  },
  required: ["antwoord", "onderbouwing", "grafieken", "interviews", "bronnen", "beperkingen"],
} as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    deelvragen: {
      type: "array",
      items: { type: "object", additionalProperties: false, properties: { nummer: { type: "integer" }, ...ANTWOORD.properties }, required: ["nummer", ...ANTWOORD.required] },
    },
    hoofdvraag: ANTWOORD,
    algemeen: { type: "string", description: "Eén of twee zinnen over de data als geheel (aantallen, wie er meededen)." },
  },
  required: ["deelvragen", "hoofdvraag", "algemeen"],
} as const;

/** Laat de AI de hoofd- en deelvragen beantwoorden uit de eigen onderzoeksdata. */
export async function getOnderzoeksAntwoorden(d: OnderzoekData): Promise<OnderzoeksAntwoorden> {
  const client = new Anthropic();
  const deelvragen = d.deelvragen.map((s, i) => {
    const { vraag, sub } = splitsDeelvraag(s.text);
    return `${i + 1}. ${vraag}${sub.length ? `\n${sub.map((x) => `   - ${x}`).join("\n")}` : ""}`;
  });

  const system = `Je helpt Dean (6 vwo) met de analyse van zijn eigen onderzoek voor zijn profielwerkstuk over AI en de arbeidsmarkt. Je beantwoordt zijn deelvragen en hoofdvraag UITSLUITEND op basis van de aangeleverde enquête- en interviewdata en zijn eigen bronnen.

Regels:
- Gebruik alleen cijfers die letterlijk in de data of in de bronsamenvattingen staan. Reken niets nieuws uit en verzin niets. Noem bij percentages het aantal invullers (n).
- Verwijs bij elk cijfer naar de vraagcode tussen blokhaken, bijv. [E1-V7].
- Kies per vraag 1 tot 4 grafieken met de codes van de vragen die het antwoord het best laten zien, en zeg in één zin waarom (veld "waarom"). Kies geen open vragen als grafiek.
- Gebruik daarnaast Deans eigen bronnen en aantekeningen (onder "Bronnen en aantekeningen"). Daarmee vul je aan wat de enquêtes niet laten zien, bijvoorbeeld hoe de arbeidsmarkt er vóór AI uitzag of cijfers over sectoren. Noem bij elke bewering uit een bron de bronvermelding zoals die erbij staat, bijv. (UWV, 2025). Gebruik alleen wat in de samenvatting of aantekening staat.
- Houd eigen onderzoek en bronnen duidelijk uit elkaar: schrijf in het antwoord welk deel uit de enquêtes komt en welk deel uit de bronnen.
- Zet een bronvermelding zoals (UWV, 2025) ALLEEN achter informatie die in de samenvatting of aantekening van díe bron staat. Komt iets uit een enquête (ook uit een open antwoord), dan is het eigen onderzoek: noem het in "antwoord" of "onderbouwing" met de vraagcode, nooit in "bronnen" en nooit met een bronvermelding.
- Ontbreekt er ook in de bronnen iets, zeg dat eerlijk in het antwoord en bij de beperkingen. Vul het gat niet zelf in met algemene kennis.
- Interviews: geef weer wat respondenten zeggen. Citeer alleen letterlijk als dat mag; anders in eigen woorden.
- Wees eerlijk over de betrouwbaarheid: het gaat om kleine, niet-representatieve groepen.
- Schrijf in helder Nederlands op vwo-niveau, met korte zinnen, zonder spelfouten.

Antwoord alleen met JSON volgens het schema.`;

  const user = `Hoofdvraag: ${d.hoofdvraag || "(nog niet ingevuld)"}

Deelvragen:
${deelvragen.join("\n")}

--- DATA ---
${dataVoorAi(d.enquetes, d.interviews)}

${bronnenVoorAi(d.bronnen, d.aantekeningen, d.deelvragen.length)}`;

  const response = await client.messages.create({
    model: ONDERZOEK_MODEL,
    max_tokens: 16000,
    system,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: user }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  if (response.stop_reason === "max_tokens") throw new Error("Het AI-antwoord was te lang en is afgebroken.");
  const blok = response.content.find((b) => b.type === "text");
  if (!blok || blok.type !== "text") throw new Error("Geen tekst in AI-antwoord");
  let raw = blok.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
  const parsed: unknown = JSON.parse(raw);
  return controleerAntwoorden(parsed, vraagRefs(d.enquetes), d.deelvragen.length);
}
