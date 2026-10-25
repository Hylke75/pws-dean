import Anthropic from "@anthropic-ai/sdk";
import { schoonHtml } from "@/lib/opmaak";

/** Schrijfhulp bij het eindverslag: eerst vragen aan de leerling, daarna de tekst herschrijven met zijn antwoorden. */

export type SchrijfhulpInput = {
  hoofdvraag: string;
  hoofdstuk: string;
  onderdeel: string;
  hint: string;
  /** wat al in de tracker staat bij dit hoofdstuk (bronsamenvattingen, aantekeningen) */
  context: string;
  /** de huidige tekst van de leerling, als platte tekst */
  tekst: string;
};

const MODEL = "claude-opus-4-8";

const BASIS = `Je helpt Dean, een leerling uit 6 vwo (Maerlant-Lyceum), met het schrijven van zijn profielwerkstuk over AI en de arbeidsmarkt. Het moet zijn eigen werk blijven: je bouwt alleen voort op wat Dean zelf schreef en antwoordde en op de aantekeningen en bronsamenvattingen uit zijn eigen tracker. Verzin nooit feiten, cijfers, bronnen of citaten. Schrijf in het Nederlands, zonder spelfouten.`;

function contextTekst(i: SchrijfhulpInput) {
  return [
    `Hoofdvraag van het PWS: ${i.hoofdvraag || "(nog niet ingevuld)"}`,
    `Hoofdstuk: ${i.hoofdstuk}`,
    `Onderdeel: ${i.onderdeel}`,
    `Wat er in dit onderdeel hoort: ${i.hint}`,
    `--- Uit de tracker (aantekeningen en bronnen) ---\n${i.context.slice(0, 10000) || "(niets)"}`,
    `--- Huidige tekst van Dean ---\n${i.tekst.trim() || "(nog leeg)"}`,
  ].join("\n\n");
}

function tekstUit(response: Anthropic.Message): string {
  const blok = response.content.find((b) => b.type === "text");
  if (!blok || blok.type !== "text") throw new Error("Geen tekst in AI-antwoord");
  return blok.text.trim();
}

const VRAGEN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { vragen: { type: "array", items: { type: "string" } } },
  required: ["vragen"],
} as const;

/** Drie tot vijf korte vragen die Dean helpen dit onderdeel (beter) te schrijven. */
export async function getSchrijfVragen(i: SchrijfhulpInput): Promise<string[]> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: `${BASIS}

Stel Dean 3 tot 5 korte, concrete vragen waarmee hij dit onderdeel van zijn verslag kan schrijven of verbeteren. Vraag naar wat er nog ontbreekt: zijn eigen mening of motivatie, wat hij uit zijn bronnen of eigen onderzoek haalt, voorbeelden, verbanden met de deelvraag. Spreek hem aan met "je". Eén vraag per item, zonder nummering. Antwoord alleen met JSON: {"vragen": [...]}.`,
    output_config: { format: { type: "json_schema", schema: VRAGEN_SCHEMA } },
    messages: [{ role: "user", content: contextTekst(i) }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  let raw = tekstUit(response).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
  const vragen = (JSON.parse(raw) as { vragen: unknown }).vragen;
  if (!Array.isArray(vragen)) throw new Error("Geen vragen in AI-antwoord");
  return vragen.filter((v): v is string => typeof v === "string" && !!v.trim()).slice(0, 5);
}

/** Herschrijft het onderdeel met de antwoorden van Dean. Geeft veilige HTML terug. */
export async function getHerschrijving(i: SchrijfhulpInput, qa: { vraag: string; antwoord: string }[]): Promise<string> {
  const client = new Anthropic();
  const antwoorden = qa
    .filter((x) => x.antwoord.trim())
    .map((x) => `Vraag: ${x.vraag}\nAntwoord van Dean: ${x.antwoord.trim()}`)
    .join("\n\n");
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: `${BASIS}

Herschrijf dit onderdeel van het verslag tot een lopende tekst. Verwerk de huidige tekst én de antwoorden van Dean. Gebruik informatie uit de tracker alleen als die bij dit onderdeel past, en noem dan de bron in de tekst in APA-stijl (Auteur, jaar). Stijl: zoals Dean schrijft, met korte, heldere zinnen in gewone woorden, maar netjes genoeg voor een verslag (geen "->" of afkortingen, geen wollige taal). Mening en ervaring alleen in de ik-vorm als Dean die zelf gaf. Voeg niets toe wat niet in het materiaal staat; ontbreekt er iets, laat het dan weg.

Antwoord alleen met de tekst als eenvoudige HTML: <p> voor alinea's, en waar het helpt <strong>, <em>, <ul>/<ol> met <li>, of <h3> voor een tussenkop. Geen andere tags, geen uitleg ervoor of erna.`,
    messages: [{ role: "user", content: `${contextTekst(i)}\n\n--- Antwoorden van Dean op de vragen ---\n${antwoorden || "(geen)"}` }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  const raw = tekstUit(response).replace(/^```(?:html)?/i, "").replace(/```$/, "").trim();
  return schoonHtml(raw);
}
