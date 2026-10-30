import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/dates";
import { bouwVerslag } from "@/lib/verslag";
import { laadVerslag } from "@/lib/verslagData";
import { naarTekst, schoonHtml } from "@/lib/opmaak";
import { laadAnalyse } from "@/lib/onderzoekOpslag";
import { laadOnderzoek } from "@/lib/onderzoekData";
import { figurenVoor, groepNaam } from "@/lib/onderzoek";
import { enkelHtml, vergelijkHtml } from "@/lib/grafiekHtml";
import { GROEP_KLEUREN } from "@/components/enquete/Grafieken";
import { TITELS } from "@/components/enquete/Vergelijking";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br/>");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Niet ingelogd", { status: 401 });

  const { input, secties } = await laadVerslag(supabase);
  const tekst = new Map(secties.map((s) => [s.section_key, (s.notes ?? "").trim()]));
  const nogSchrijven = (label: string) => `<p style="color:#b45309"><i>[Nog schrijven: ${esc(label)}]</i></p>`;
  const blokken: string[] = [];

  // Grafieken uit het eigen onderzoek per deelvraag, zoals gekozen in de laatste analyse; de cijfers zijn altijd actueel.
  const analyse = await laadAnalyse(supabase);
  const onderzoek = analyse ? await laadOnderzoek(supabase) : null;
  let figuurNr = 0;
  function grafieken(nummer: number): string {
    const keuze = analyse?.resultaat.deelvragen[nummer - 1]?.grafieken ?? [];
    if (!onderzoek || !keuze.length) return "";
    const delen = figurenVoor(keuze, onderzoek.enquetes).map((f) => {
      if (f.soort === "vergelijk") {
        const reeksen = f.per.map(({ enquete, vraag }) => {
          const e = onderzoek.enquetes[enquete];
          return { naam: groepNaam(e.title), kleur: GROEP_KLEUREN[enquete % GROEP_KLEUREN.length], vraag, reacties: e.reacties };
        });
        const titel = TITELS[f.sleutel] ?? f.per[0].vraag.text;
        return `<p><b>Figuur ${++figuurNr}.</b> ${esc(titel)} <i>(vergelijking tussen de doelgroepen)</i></p>${vergelijkHtml(reeksen)}`;
      }
      const html = enkelHtml(f.vraag, onderzoek.enquetes[f.enquete].reacties);
      if (!html) return "";
      const e = onderzoek.enquetes[f.enquete];
      return `<p><b>Figuur ${++figuurNr}.</b> ${esc(f.vraag.text)} <i>(enquête ${esc(groepNaam(e.title))}, n = ${e.reacties.length})</i></p>${html}`;
    });
    return delen.filter(Boolean).join("<br/>");
  }

  for (const h of bouwVerslag(input)) {
    if (h.key === "titelpagina") {
      const titel = tekst.get("titel") || "Profielwerkstuk";
      const regels = [tekst.get("ondertitel") && naarTekst(tekst.get("ondertitel")!), input.naam, "Maerlant-Lyceum · 6 vwo", tekst.get("begeleider"), input.inleverdatum && fmtDate(input.inleverdatum)]
        .filter((x): x is string => !!x)
        .map((x) => `<p>${esc(x)}</p>`)
        .join("");
      blokken.push(`<h1>${esc(titel)}</h1>${regels}<br style="page-break-before:always"/>`);
      continue;
    }
    const kop = h.bijlage ? `${h.nummer}: ${h.titel}` : h.nummer ? `${h.nummer}. ${h.titel}` : h.titel;
    const stukken: string[] = [];
    for (const f of h.schrijven) {
      const t = tekst.get(f.key);
      // Bij een hoofdstuk per deelvraag komen de grafieken vóór de conclusie van het hoofdstuk.
      if (h.key.startsWith("h:") && f.key.endsWith(":conclusie")) {
        const g = grafieken(Number(h.nummer));
        if (g) stukken.push(`<h3>Resultaten uit eigen onderzoek</h3>${g}<p style="color:#b45309"><i>[Leg de figuren hierboven uit in je tekst.]</i></p>`);
      }
      // Hoofdstukken met meerdere stukken krijgen per paragraaf een kop (de inleiding van het hoofdstuk niet).
      if (h.schrijven.length > 1 && !f.key.endsWith(":intro")) stukken.push(`<h3>${esc(f.label)}</h3>`);
      stukken.push(t ? schoonHtml(t) : nogSchrijven(f.label));
    }
    // Hoofdstukken zonder schrijfwerk (bronnen, bijlagen) vult het systeem zelf.
    if (!h.schrijven.length) {
      for (const b of h.auto) stukken.push(`<p><b>${esc(b.titel)}</b><br/>${nl2br(b.tekst)}</p>`);
    }
    blokken.push(`<h2>${esc(kop)}</h2>${stukken.join("")}`);
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111}
    h1{font-size:22pt} h3{font-size:12pt;margin-top:12pt} h2{font-size:15pt;margin-top:24pt;border-bottom:1px solid #999;padding-bottom:2pt}
    table{width:100%;font-size:10pt} th{text-align:left;background:#f0f0f0}
  </style></head><body>
    ${blokken.join("")}
  </body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "application/msword;charset=utf-8",
      "Content-Disposition": `attachment; filename="Profielwerkstuk.doc"`,
    },
  });
}
