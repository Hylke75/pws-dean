import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/dates";
import { bouwVerslag } from "@/lib/verslag";
import { laadVerslag } from "@/lib/verslagData";
import { naarTekst, schoonHtml } from "@/lib/opmaak";

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
