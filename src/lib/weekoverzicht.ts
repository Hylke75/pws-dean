import { bouwVerslag, schrijfTempo, type VerslagInput } from "@/lib/verslag";
import { LOGBOEK_DOEL_UREN } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { esc } from "@/lib/email";
import type { Subquestion } from "@/lib/types";

/** Wat pws_weekoverzicht() teruggeeft. */
export type WeekGegevens = {
  minuten_totaal: number;
  minuten_week: number;
  geschreven: string[];
  deelvragen: Pick<Subquestion, "id" | "text" | "order_index">[];
  volgende_deadline: { titel: string; deadline: string } | null;
  einddatum: string | null;
  interviews_open: number;
  interviews_afgerond: number;
  enquetes: { titel: string; totaal: number; week: number }[];
};

const uren = (min: number) => (min / 60).toFixed(1).replace(".", ",");

/** Onderwerp en inhoud van de wekelijkse mail aan de leerling. */
export function weekMail(g: WeekGegevens, naam: string | null, vandaag: Date): { onderwerp: string; html: string } {
  // Alleen de deelvragen bepalen welke schrijfstukken er zijn; de rest van de invoer is hier niet nodig.
  const input: VerslagInput = {
    veldData: {},
    deelvragen: g.deelvragen.map((d) => ({ ...d, created_at: "" })),
    bronnen: [],
    logboek: [],
    enquetes: [],
    interviews: [],
    naam,
    inleverdatum: null,
    faseIds: {},
  };
  const stukken = bouwVerslag(input).flatMap((h) => h.schrijven);
  const geschreven = new Set(g.geschreven);
  const nog = stukken.filter((f) => !geschreven.has(f.key));
  const tempo = schrijfTempo(nog.length, g.einddatum, vandaag);
  const deze = nog.slice(0, Math.min(5, Math.max(1, tempo?.perWeek ?? 3)));

  const rij = (kop: string, tekst: string) =>
    `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#64748b;white-space:nowrap">${kop}</td><td style="padding:6px 0">${tekst}</td></tr>`;

  const regels: string[] = [];
  regels.push(
    rij("Logboek", `<strong>${uren(g.minuten_totaal)}</strong> van de ${LOGBOEK_DOEL_UREN} uur${g.minuten_week ? ` (deze week ${uren(g.minuten_week)} uur erbij)` : " (vorige week niets bijgeschreven)"}`),
  );
  regels.push(
    rij(
      "Verslag",
      `<strong>${stukken.length - nog.length}</strong> van de ${stukken.length} stukken geschreven${
        nog.length && tempo && g.einddatum
          ? tempo.weken
            ? `. Om op ${fmtDate(g.einddatum)} klaar te zijn: ± <strong>${tempo.perWeek}</strong> per week.`
            : `. De einddatum (${fmtDate(g.einddatum)}) is voorbij.`
          : ""
      }`,
    ),
  );
  if (g.volgende_deadline) regels.push(rij("Deadline", `${esc(g.volgende_deadline.titel)}: ${fmtDate(g.volgende_deadline.deadline)}`));
  regels.push(
    rij(
      "Interviews",
      `${g.interviews_afgerond} afgerond${g.interviews_open ? `, <strong>${g.interviews_open}</strong> uitgenodigd maar nog niet ingevuld (stuur eventueel een herinnering)` : ""}`,
    ),
  );
  if (g.enquetes.length)
    regels.push(
      rij("Enquêtes", g.enquetes.map((e) => `${esc(e.titel.split("–").pop()!.trim())}: ${e.totaal}${e.week ? ` (+${e.week})` : ""}`).join("<br/>")),
    );

  const html = `<p>Hoi ${esc((naam ?? "").split(" ")[0] || "Dean")},</p>
<p>Zo staat je profielwerkstuk ervoor:</p>
<table style="border-collapse:collapse;font-size:14px">${regels.join("")}</table>
${
  deze.length
    ? `<p style="margin-top:16px"><strong>Schrijf deze week:</strong></p><ul>${deze.map((f) => `<li>${esc(f.label)}</li>`).join("")}</ul>`
    : `<p style="margin-top:16px"><strong>Alle stukken van je verslag zijn geschreven.</strong> Lees alles nog eens goed door.</p>`
}`;
  const onderwerp = nog.length ? `📋 Je PWS deze week: ${deze.length} ${deze.length === 1 ? "stuk" : "stukken"} schrijven` : "📋 Je PWS: weekoverzicht";
  return { onderwerp, html };
}
