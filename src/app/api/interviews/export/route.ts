import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interviewsNaarCsv, respondentNummers, type IvAntwoord, type IvThema, type IvUitnodiging } from "@/lib/interview";
import { vergelijkDocx, vergelijkPdf, verslagDocx, verslagPdf, type ExportData } from "@/lib/interviewExport";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FORMATEN = ["pdf", "docx", "csv", "vergelijk-pdf", "vergelijk-docx"] as const;
type Formaat = (typeof FORMATEN)[number];

// Alles behalve de token-hash.
const KOLOMMEN =
  "id, type_id, type_naam, naam, email, functie, organisatie, boodschap, aanspreekvorm, intro, vragen, status, gearchiveerd, toestemming, uitgenodigd_op, laatste_activiteit, afgerond_op, bewaren_tot, created_at, taal";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  if (!mag) return NextResponse.json({ error: "geen toegang" }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const formaat = p.get("formaat") as Formaat;
  if (!FORMATEN.includes(formaat)) return NextResponse.json({ error: "onbekend formaat" }, { status: 400 });
  const ids = (p.get("ids") ?? "").split(",").filter((x) => UUID.test(x)).slice(0, 500);
  const anoniem = p.get("anoniem") === "1";

  // Alle uitnodigingen (alleen id en datum) voor vaste respondentnummers.
  const { data: alle } = await supabase.from("pws_iv_uitnodigingen").select("id, created_at");
  let q = supabase.from("pws_iv_uitnodigingen").select(KOLOMMEN).order("created_at");
  q = ids.length ? q.in("id", ids) : q.eq("gearchiveerd", false).in("status", ["gestart", "afgerond"]);
  const { data: uitnodigingen } = await q;
  const lijst = (uitnodigingen as unknown as IvUitnodiging[]) ?? [];
  if (!lijst.length) return NextResponse.json({ error: "geen interviews om te exporteren" }, { status: 404 });

  const [{ data: antwoorden }, { data: themas }] = await Promise.all([
    supabase.from("pws_iv_antwoorden").select("*").in("uitnodiging_id", lijst.map((u) => u.id)),
    supabase.from("pws_iv_themas").select("*").order("order_index"),
  ]);

  const data: ExportData = {
    uitnodigingen: lijst,
    antwoorden: (antwoorden as IvAntwoord[]) ?? [],
    themas: (themas as IvThema[]) ?? [],
    nummers: respondentNummers((alle as { id: string; created_at: string }[]) ?? []),
    anoniem,
  };

  const stam = `interviews${anoniem ? "-anoniem" : ""}-${new Date().toISOString().slice(0, 10)}`;
  const bestand = (inhoud: Uint8Array | string, type: string, naam: string) =>
    new Response(typeof inhoud === "string" ? inhoud : Buffer.from(inhoud), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${naam}"`,
        "Cache-Control": "no-store",
      },
    });

  switch (formaat) {
    case "csv":
      return bestand("﻿" + interviewsNaarCsv(data.uitnodigingen, data.antwoorden, data.themas, data.nummers, anoniem), "text/csv; charset=utf-8", `${stam}.csv`);
    case "pdf":
      return bestand(await verslagPdf(data), "application/pdf", `${stam}.pdf`);
    case "docx":
      return bestand(await verslagDocx(data), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", `${stam}.docx`);
    case "vergelijk-pdf":
      return bestand(await vergelijkPdf(data), "application/pdf", `vergelijking-${stam}.pdf`);
    case "vergelijk-docx":
      return bestand(await vergelijkDocx(data), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", `vergelijking-${stam}.docx`);
  }
}
