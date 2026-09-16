export type VerslagSectieConfig = {
  key: string;
  title: string;
  description: string;
  bron?: string; // waar in de tool staat de inhoud al?
};

/**
 * De onderdelen die in het definitieve PWS-verslag horen. Gebaseerd op de
 * standaard opbouw van een profielwerkstukverslag. Let op: controleer de
 * exacte eisen en citeerregels in Bijlage 1 van de schoolhandleiding.
 */
export const VERSLAG_SECTIES: VerslagSectieConfig[] = [
  { key: "titelpagina", title: "Titelpagina", description: "Titel van het PWS, je naam(en), klas, vak, begeleider, school en datum." },
  { key: "voorwoord", title: "Voorwoord (optioneel)", description: "Persoonlijk stukje: waarom dit onderwerp, en een dankwoord aan wie je hielp." },
  { key: "inhoudsopgave", title: "Inhoudsopgave", description: "Alle hoofdstukken met paginanummers. Maak dit als laatste." },
  { key: "inleiding", title: "Inleiding", description: "Aanleiding, je hoofdvraag en deelvragen, en een korte leeswijzer.", bron: "Fase 1 & 2" },
  { key: "theorie", title: "Theoretisch kader", description: "Wat is er al bekend uit je bronnen? De achtergrondinformatie die je onderzoek onderbouwt.", bron: "Fase 4 & Bronnen" },
  { key: "methode", title: "Onderzoeksmethode", description: "Hoe heb je het onderzocht? Beschrijf je enquête/interview/experiment, bij wie en hoeveel.", bron: "Fase 3, 5 & 6" },
  { key: "resultaten", title: "Resultaten", description: "Wat kwam eruit? Feiten, tabellen en grafieken — nog zonder interpretatie.", bron: "Fase 7 & Enquête" },
  { key: "analyse", title: "Analyse", description: "Wat betekenen de resultaten? Patronen, verschillen en verbanden.", bron: "Fase 8 & 9" },
  { key: "conclusie", title: "Conclusie", description: "Het onderbouwde antwoord op je hoofdvraag, volgend uit de deelvragen.", bron: "Fase 10" },
  { key: "discussie", title: "Discussie & reflectie", description: "Betrouwbaarheid, beperkingen, wat je anders zou doen en vervolgonderzoek.", bron: "Fase 11" },
  { key: "bronnenlijst", title: "Bronnenlijst", description: "Alle gebruikte bronnen in APA-stijl, op alfabet.", bron: "Bronnen" },
  { key: "logboek", title: "Logboek", description: "Je complete logboek met minimaal 80 uur per persoon, bijgehouden tijdens het werk.", bron: "Logboek" },
  { key: "bijlagen", title: "Bijlagen", description: "Je enquête, ruwe data, interviewuitwerkingen en overige documenten.", bron: "Bijlagen per fase" },
];
