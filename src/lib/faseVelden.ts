export type VeldType = "kort" | "lang" | "lijst";

export type Veld = {
  key: string;
  label: string;
  type: VeldType;
  placeholder?: string;
  hint?: string;
};

/**
 * Per fase (op order_index) de concrete invulvelden waarmee de leerling
 * het echte werk van die fase invult. Fases die hier niet staan, tonen
 * één algemeen uitwerkingsveld.
 */
export const FASE_VELDEN: Record<number, Veld[]> = {
  1: [
    { key: "onderwerp", label: "Mijn onderwerp", type: "kort", placeholder: "Bijv. De invloed van social media op slaap bij tieners" },
    { key: "afbakening", label: "Afbakening", type: "lang", placeholder: "Wat onderzoek je wel en wat niet? Welke doelgroep, periode of context?" },
    { key: "waarom", label: "Waarom dit onderwerp?", type: "lang", placeholder: "Wat maakt dit interessant of relevant om te onderzoeken?" },
  ],
  2: [
    { key: "hoofdvraag", label: "Hoofdvraag", type: "lang", placeholder: "Eén duidelijke, onderzoekbare hoofdvraag." },
    { key: "deelvragen", label: "Deelvragen", type: "lijst", placeholder: "Eén deelvraag per regel", hint: "Zet elke deelvraag op een nieuwe regel." },
  ],
  3: [
    { key: "aanpak", label: "Aanpak per deelvraag", type: "lang", placeholder: "Hoe ga je elke deelvraag beantwoorden?" },
    { key: "bronnenonderzoek", label: "Bronnenonderzoek", type: "lang", placeholder: "Welke soort bronnen ga je gebruiken?" },
    { key: "eigen_onderzoek", label: "Eigen onderzoek", type: "lang", placeholder: "Enquête, interview, experiment of observatie? Beschrijf je methode." },
  ],
  4: [
    { key: "kernpunten", label: "Kernpunten uit de bronnen", type: "lang", placeholder: "Wat heb je geleerd uit je bronnen? (bronnen zelf beheer je op de Bronnen-pagina)" },
  ],
  5: [
    { key: "instrument", label: "Onderzoeksinstrument", type: "lang", placeholder: "Jouw enquête-, interview- of testvragen." },
    { key: "test", label: "Uitkomst van de test", type: "lang", placeholder: "Wat kwam eruit toen je het vooraf uitprobeerde? Wat pas je aan?" },
  ],
  6: [
    { key: "uitvoering", label: "Hoe is het uitgevoerd?", type: "lang", placeholder: "Wanneer, bij wie en hoeveel respondenten/metingen?" },
    { key: "data", label: "Verzamelde gegevens", type: "lang", placeholder: "Korte beschrijving van je ruwe data (grote bestanden als bijlage toevoegen)." },
  ],
  7: [
    { key: "ordening", label: "Ordening van resultaten", type: "lang", placeholder: "Hoe heb je je resultaten geordend?" },
    { key: "eerste_analyse", label: "Eerste analyse", type: "lang", placeholder: "Wat valt je op in de eerste resultaten?" },
  ],
  8: [
    { key: "patronen", label: "Patronen en verschillen", type: "lang", placeholder: "Welke patronen, verschillen of opvallende resultaten zie je?" },
    { key: "visualisaties", label: "Grafieken / visualisaties", type: "lang", placeholder: "Welke grafieken heb je gemaakt en wat laten ze zien? (afbeeldingen als bijlage)" },
  ],
  9: [
    { key: "antwoorden", label: "Antwoorden op de deelvragen", type: "lang", placeholder: "Beantwoord per deelvraag, met eigen resultaten + bronnen." },
  ],
  10: [
    { key: "antwoord_hoofdvraag", label: "Antwoord op de hoofdvraag", type: "lang", placeholder: "Het onderbouwde antwoord op je hoofdvraag." },
    { key: "conclusie", label: "Conclusie", type: "lang", placeholder: "Je conclusie, volgend uit de deelvragen." },
  ],
  11: [
    { key: "betrouwbaarheid", label: "Betrouwbaarheid", type: "lang", placeholder: "Hoe betrouwbaar is je onderzoek?" },
    { key: "beperkingen", label: "Beperkingen", type: "lang", placeholder: "Wat waren de beperkingen? Wat had anders gekund?" },
    { key: "vervolg", label: "Vervolgonderzoek", type: "lang", placeholder: "Welk vervolgonderzoek zou interessant zijn?" },
  ],
  12: [
    { key: "stand", label: "Stand van zaken", type: "lang", placeholder: "Welke onderdelen zijn af? Voeg je complete versie als bijlage toe." },
  ],
  13: [
    { key: "feedbackvraag", label: "Waar wil je feedback op?", type: "lang", placeholder: "Op welke onderdelen wil je gerichte feedback van je begeleider?" },
  ],
  14: [
    { key: "verwerkt", label: "Wat heb je aangepast?", type: "lang", placeholder: "Welke feedback heb je verwerkt en hoe?" },
  ],
  16: [
    { key: "samenhang", label: "Controle op samenhang", type: "lang", placeholder: "Sluiten hoofdvraag, onderzoek, resultaten en conclusie logisch op elkaar aan?" },
  ],
  17: [
    { key: "afwerking", label: "Afwerking", type: "lang", placeholder: "Wat heb je verbeterd aan tekst, structuur, bronvermelding en bijlagen?" },
  ],
  22: [
    { key: "wat_weten", label: "Wat wilde ik weten?", type: "lang", placeholder: "In één of twee zinnen." },
    { key: "hoe_onderzocht", label: "Hoe heb ik het onderzocht?", type: "lang" },
    { key: "wat_ontdekt", label: "Wat heb ik ontdekt?", type: "lang" },
    { key: "conclusie", label: "Mijn conclusie", type: "lang" },
  ],
};

export function veldenVoorFase(orderIndex: number): Veld[] {
  return FASE_VELDEN[orderIndex] ?? [];
}
