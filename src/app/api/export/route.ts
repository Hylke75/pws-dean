import { createClient } from "@/lib/supabase/server";
import { FASE_VELDEN } from "@/lib/faseVelden";
import { toApa } from "@/lib/apa";
import { fmtDate } from "@/lib/dates";
import type { Phase, Source, LogEntry } from "@/lib/types";

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

  const [{ data: phasesData }, { data: sourcesData }, { data: logsData }, { data: interviewsData }, { data: itemsData }] =
    await Promise.all([
      supabase.from("pws_phases").select("*").order("order_index"),
      supabase.from("pws_sources").select("*"),
      supabase.from("pws_logboek").select("*").order("log_date"),
      supabase.from("pws_interviews").select("*").order("created_at"),
      supabase.from("pws_interview_items").select("*").order("order_index"),
    ]);
  const phases = (phasesData as Phase[]) ?? [];
  const sources = ((sourcesData as Source[]) ?? []).slice().sort((a, b) => (a.authors || a.title).localeCompare(b.authors || b.title));
  const logs = (logsData as LogEntry[]) ?? [];
  const interviews = (interviewsData as { id: string; respondent: string | null; rol: string | null; datum: string | null }[]) ?? [];
  const interviewItems = (itemsData as { interview_id: string; vraag: string | null; antwoord: string | null }[]) ?? [];

  const blokken: string[] = [];

  // Fases met ingevulde velden
  for (const p of phases) {
    const velden = FASE_VELDEN[p.order_index] ?? [];
    const vd = (p.veld_data ?? {}) as Record<string, string>;
    const stukken: string[] = [];
    for (const v of velden) {
      const val = (vd[v.key] ?? "").trim();
      if (val) stukken.push(`<p><b>${esc(v.label)}:</b><br/>${nl2br(val)}</p>`);
    }
    if ((p.notes ?? "").trim()) stukken.push(`<p>${nl2br(p.notes!.trim())}</p>`);
    if (stukken.length) {
      blokken.push(`<h2>Fase ${p.order_index}: ${esc(p.title)}</h2>${stukken.join("")}`);
    }
  }

  // Interviews (als bijlage)
  if (interviews.length) {
    const blok = interviews
      .map((iv) => {
        const kop = [iv.respondent, iv.rol, iv.datum ? fmtDate(iv.datum) : null]
          .filter((x): x is string => !!x)
          .map(esc)
          .join(" · ");
        const qa = interviewItems
          .filter((x) => x.interview_id === iv.id)
          .map((x) => `<p><b>${esc(x.vraag ?? "")}</b><br/>${nl2br(x.antwoord ?? "")}</p>`)
          .join("");
        return `<h3>${kop || "Interview"}</h3>${qa}`;
      })
      .join("");
    blokken.push(`<h2>Interviews</h2>${blok}`);
  }

  // Bronnenlijst (APA, alfabet)
  if (sources.length) {
    const lijst = sources.map((s) => `<p>${esc(toApa(s))}</p>`).join("");
    blokken.push(`<h2>Bronnenlijst</h2>${lijst}`);
  }

  // Logboek
  if (logs.length) {
    const totaal = logs.reduce((s, l) => s + l.minutes, 0);
    const rows = logs
      .map((l) => {
        const tijd = l.begin_tijd && l.eind_tijd ? `${l.begin_tijd.slice(0, 5)}–${l.eind_tijd.slice(0, 5)}` : "";
        const duur = `${Math.floor(l.minutes / 60)}u ${l.minutes % 60}m`;
        return `<tr><td>${fmtDate(l.log_date)}</td><td>${tijd}</td><td>${duur}</td><td>${esc(l.activity)}</td></tr>`;
      })
      .join("");
    blokken.push(
      `<h2>Logboek</h2><p>Totaal: ${(totaal / 60).toFixed(1)} uur</p>` +
        `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse"><tr><th>Datum</th><th>Tijd</th><th>Duur</th><th>Activiteit</th></tr>${rows}</table>`,
    );
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111}
    h1{font-size:22pt} h2{font-size:15pt;margin-top:24pt;border-bottom:1px solid #999;padding-bottom:2pt}
    table{width:100%;font-size:10pt} th{text-align:left;background:#f0f0f0}
  </style></head><body>
    <h1>Profielwerkstuk</h1>
    <p>Export uit de PWS-tracker · ${fmtDate(new Date().toISOString().slice(0, 10))}</p>
    ${blokken.join("")}
  </body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "application/msword;charset=utf-8",
      "Content-Disposition": `attachment; filename="Profielwerkstuk.doc"`,
    },
  });
}
