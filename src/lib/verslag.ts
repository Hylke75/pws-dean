export type VerslagSectieConfig = {
  key: string;
  title: string;
  description: string;
  bron?: string; // waar in de tool staat de inhoud al?
};

/**
 * De onderdelen die in het definitieve PWS-verslag horen, afgestemd op de
 * eisen van het Maerlant-Lyceum (APA-stijl, conceptversie ≥ 15 pagina's,
 * resultaten per deelvraag, bronnenlijst op alfabet).
 */
export const VERSLAG_SECTIES: VerslagSectieConfig[] = [
  { key: "titelpagina", title: "Titelpagina", description: "Titel van het PWS, je naam, klas, vak, begeleider, school (Maerlant-Lyceum) en datum." },
  { key: "voorwoord", title: "Voorwoord (optioneel)", description: "Persoonlijk stukje: waarom dit onderwerp, en een dankwoord aan wie je hielp." },
  { key: "inhoudsopgave", title: "Inhoudsopgave", description: "Alle hoofdstukken met paginanummers. Maak dit als laatste." },
  { key: "inleiding", title: "Inleiding", description: "Aanleiding, achtergrond en relevantie van je onderzoek, je hoofdvraag en deelvragen, en een korte leeswijzer.", bron: "Fase 1 & 2" },
  { key: "theorie", title: "Theoretisch kader", description: "Wat is er al bekend uit je bronnen? De achtergrondinformatie (met APA-bronvermelding) die je onderzoek onderbouwt.", bron: "Fase 4 & Bronnen" },
  { key: "methode", title: "Onderzoeksmethode", description: "Een stapsgewijze, objectieve beschrijving van hóe je het onderzoek hebt uitgevoerd: welk instrument, bij wie, hoeveel en wanneer.", bron: "Fase 3, 5 & 6" },
  { key: "resultaten", title: "Resultaten", description: "Je resultaten per deelvraag, met grafieken en tabellen die je in de tekst uitlegt — nog zonder interpretatie.", bron: "Fase 7 & Enquête" },
  { key: "analyse", title: "Analyse", description: "Wat betekenen de resultaten? Patronen, verschillen en verbanden (mag samen met de resultaten per deelvraag).", bron: "Fase 8 & 9" },
  { key: "conclusie", title: "Conclusie", description: "Het antwoord op je hoofd- en deelvragen, onderbouwd met je eigen resultaten én de literatuur.", bron: "Fase 10" },
  { key: "discussie", title: "Discussie & reflectie", description: "Betrouwbaarheid, beperkingen, wat je anders zou doen en vervolgonderzoek.", bron: "Fase 11" },
  { key: "bronnenlijst", title: "Bronnenlijst", description: "Alle gebruikte bronnen in APA-stijl, op alfabetische volgorde.", bron: "Bronnen" },
  { key: "logboek", title: "Logboek", description: "Je complete logboek met minimaal 80 uur, bijgehouden tijdens het werk (niet achteraf).", bron: "Logboek" },
  { key: "bijlagen", title: "Bijlagen", description: "Je meetinstrument (enquête/interviewvragen), ruwe data, uitwerkingen en overige documenten.", bron: "Enquête & Bijlagen per fase" },
];
