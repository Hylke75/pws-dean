export type VeldType = "kort" | "lang" | "lijst";

export type Veld = {
  key: string;
  label: string;
  type: VeldType;
  placeholder?: string;
  hint?: string;
  voorbeeld?: string;
};

export type FaseHulp = {
  aanpak?: string[];
  letOp?: string[];
  voorbeeldGoed?: string;
  voorbeeldFout?: string;
};

/**
 * Per fase (op order_index) de concrete invulvelden waarmee de leerling
 * het echte werk van die fase invult. Fases die hier niet staan, tonen
 * één algemeen uitwerkingsveld.
 */
export const FASE_VELDEN: Record<number, Veld[]> = {
  1: [
    { key: "onderwerp", label: "Mijn onderwerp", type: "kort", placeholder: "Bijv. De invloed van social media op slaap bij tieners", voorbeeld: "Goed afgebakend: 'De invloed van social media in het uur voor het slapengaan op de slaapkwaliteit van 15–17-jarigen.'" },
    { key: "afbakening", label: "Afbakening", type: "lang", placeholder: "Wat onderzoek je wel en wat niet? Welke doelgroep, periode of context?", hint: "Een algemeen onderwerp ('het klimaat') is geen PWS — maak het smal en concreet." },
    { key: "vak", label: "Bij welk vak / begeleider past dit?", type: "kort", placeholder: "Bijv. biologie, of maatschappijleer" },
    { key: "haalbaar", label: "Is dit haalbaar in ~80 uur?", type: "lang", placeholder: "Waarom is dit te doen binnen de tijd en met jouw mogelijkheden?" },
    { key: "waarom", label: "Waarom dit onderwerp?", type: "lang", placeholder: "Wat maakt dit interessant of relevant om te onderzoeken?" },
  ],
  2: [
    { key: "hoofdvraag", label: "Hoofdvraag", type: "lang", placeholder: "Eén duidelijke, onderzoekbare hoofdvraag.", hint: "Een goede hoofdvraag is open (niet met ja/nee te beantwoorden), afgebakend en meetbaar.", voorbeeld: "'In hoeverre beïnvloedt schermtijd in het uur voor het slapengaan de slaapkwaliteit van 15–17-jarigen?'" },
    { key: "deelvragen", label: "Deelvragen", type: "lijst", placeholder: "Eén deelvraag per regel", hint: "3–5 deelvragen die samen de hoofdvraag beantwoorden: meestal 1–2 uit bronnen (theorie) en 1–2 uit eigen onderzoek." },
  ],
  3: [
    { key: "aanpak", label: "Aanpak per deelvraag", type: "lang", placeholder: "Zet per deelvraag: beantwoord ik die met bronnen, met eigen onderzoek, of allebei?" },
    { key: "bronnenonderzoek", label: "Bronnenonderzoek", type: "lang", placeholder: "Welke soort bronnen ga je gebruiken (boeken, wetenschappelijke artikelen, betrouwbare websites)?" },
    { key: "eigen_onderzoek", label: "Eigen onderzoek (methode)", type: "lang", placeholder: "Enquête, interview, experiment of observatie? Beschrijf wie/wat/hoe.", hint: "Kies een methode die past bij je deelvragen. Een enquête maak je in het tabblad 'Enquête'." },
  ],
  4: [
    { key: "kernpunten", label: "Kernpunten uit de bronnen", type: "lang", placeholder: "Wat heb je geleerd? Noteer per bron de belangrijkste punten.", hint: "Werk je bronnen volledig uit op de Bronnen-pagina (samenvatting, citaten, betrouwbaarheid)." },
  ],
  5: [
    { key: "instrument", label: "Onderzoeksinstrument", type: "lang", placeholder: "Beschrijf je enquête/interview/test. De enquête zelf bouw je in het tabblad 'Enquête'." },
    { key: "test", label: "Uitkomst van de proef-afname", type: "lang", placeholder: "Wat kwam eruit toen je het vooraf uitprobeerde? Wat pas je aan?", hint: "Test altijd eerst bij 1–2 mensen of je vragen duidelijk zijn en bruikbare antwoorden geven." },
  ],
  6: [
    { key: "uitvoering", label: "Hoe is het uitgevoerd?", type: "lang", placeholder: "Wanneer, bij wie en hoeveel respondenten/metingen?" },
    { key: "data", label: "Verzamelde gegevens", type: "lang", placeholder: "Korte beschrijving van je ruwe data (grote bestanden als bijlage toevoegen)." },
  ],
  7: [
    { key: "ordening", label: "Ordening van resultaten", type: "lang", placeholder: "Hoe heb je je resultaten geordend (tabel, categorieën, per vraag)?" },
    { key: "eerste_analyse", label: "Eerste analyse", type: "lang", placeholder: "Wat valt je op in de eerste resultaten?" },
  ],
  8: [
    { key: "patronen", label: "Patronen en verschillen", type: "lang", placeholder: "Welke patronen, verschillen of opvallende resultaten zie je?" },
    { key: "visualisaties", label: "Grafieken / visualisaties", type: "lang", placeholder: "Welke grafieken heb je gemaakt en wat laten ze zien? (afbeeldingen als bijlage)", hint: "Bij een enquête staan de grafieken al klaar in het tabblad 'Enquête' → Resultaten." },
  ],
  9: [
    { key: "antwoorden", label: "Antwoorden op de deelvragen", type: "lang", placeholder: "Beantwoord per deelvraag, en combineer je eigen resultaten met wat je bronnen zeggen." },
  ],
  10: [
    { key: "antwoord_hoofdvraag", label: "Antwoord op de hoofdvraag", type: "lang", placeholder: "Het onderbouwde antwoord op je hoofdvraag." },
    { key: "conclusie", label: "Conclusie", type: "lang", placeholder: "Je conclusie, die logisch volgt uit de deelvragen." },
  ],
  11: [
    { key: "betrouwbaarheid", label: "Betrouwbaarheid", type: "lang", placeholder: "Hoe betrouwbaar is je onderzoek? Denk aan aantal respondenten, meetfouten, toeval." },
    { key: "beperkingen", label: "Beperkingen", type: "lang", placeholder: "Wat waren de beperkingen? Wat had je anders kunnen doen?" },
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

/** Sturende hulp per fase: aanpak-stappen, aandachtspunten en voorbeelden. */
export const FASE_HULP: Record<number, FaseHulp> = {
  1: {
    aanpak: [
      "Schrijf 2–3 dingen op die je écht interesseren.",
      "Maak er een concrete, smalle vraag van (niet 'het klimaat' maar 'wat…').",
      "Check of het haalbaar is in ~80 uur met de middelen die je hebt.",
      "Bedenk bij welk vak/begeleider het past en leg het voor.",
    ],
    letOp: ["Een te breed onderwerp is de meest gemaakte fout.", "Je hoeft geen Nobelprijs te winnen — laat zien wat je kunt op examenniveau."],
    voorbeeldGoed: "Slaap en schermtijd bij tieners in het uur voor bedtijd.",
    voorbeeldFout: "Social media (te breed, geen vraag).",
  },
  2: {
    aanpak: [
      "Formuleer één hoofdvraag die je met onderzoek kunt beantwoorden.",
      "Bedenk 3–5 deelvragen die samen de hoofdvraag afdekken.",
      "Zorg dat een paar deelvragen uit bronnen komen en een paar uit eigen onderzoek.",
      "Bespreek ze met je begeleider en scherp ze aan.",
    ],
    letOp: ["Vermijd een hoofdvraag die je met ja/nee kunt beantwoorden.", "Elke deelvraag moet echt bijdragen aan het antwoord op de hoofdvraag."],
    voorbeeldGoed: "Hoofdvraag + deelvragen zoals: 'Wat zegt onderzoek over blauw licht en slaap?' en 'Hoeveel schermtijd hebben tieners vlak voor bedtijd?'",
    voorbeeldFout: "Deelvragen die eigenlijk hetzelfde vragen of niets met de hoofdvraag te maken hebben.",
  },
  3: {
    aanpak: [
      "Zet per deelvraag: beantwoord ik die met bronnen, eigen onderzoek of allebei?",
      "Kies je onderzoeksmethode (enquête, interview, experiment, observatie).",
      "Plan globaal wanneer je wat doet — en start je logboek.",
    ],
    letOp: ["Een goede methode past bij je deelvraag: wil je meningen van veel mensen? → enquête. Diepere ervaring? → interview."],
  },
  4: {
    aanpak: [
      "Zoek betrouwbare bronnen (boeken, wetenschappelijke artikelen, serieuze websites).",
      "Werk elke bron uit op de Bronnen-pagina: samenvatting, citaten, betrouwbaarheid, bij welke deelvraag.",
      "Noteer meteen alle gegevens voor je bronvermelding.",
    ],
    letOp: ["Beoordeel bij elke bron: wie is de auteur, hoe actueel is het, en is het objectief?"],
  },
  5: {
    aanpak: [
      "Werk je onderzoeksinstrument helemaal uit (bouw je enquête in het tabblad 'Enquête').",
      "Test het eerst bij 1–2 mensen.",
      "Pas onduidelijke of onbruikbare vragen aan.",
    ],
    letOp: ["Stel geen sturende vragen.", "Zorg dat je met de antwoorden je deelvraag ook echt kunt beantwoorden."],
  },
  10: {
    aanpak: ["Geef een onderbouwd antwoord op de hoofdvraag.", "Zorg dat je conclusie volgt uit je deelvragen — geen nieuwe informatie."],
    letOp: ["De conclusie is een antwoord, geen samenvatting."],
  },
  11: {
    aanpak: ["Wees eerlijk over de betrouwbaarheid en beperkingen.", "Benoem wat je anders zou doen en welk vervolgonderzoek interessant is."],
    letOp: ["Kritisch zijn op je eigen onderzoek levert juist punten op."],
  },
};

export function veldenVoorFase(orderIndex: number): Veld[] {
  return FASE_VELDEN[orderIndex] ?? [];
}

export function hulpVoorFase(orderIndex: number): FaseHulp | null {
  return FASE_HULP[orderIndex] ?? null;
}
