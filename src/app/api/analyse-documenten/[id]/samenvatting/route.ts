import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar } from "@/lib/ai";
import { getAnalyseSamenvatting } from "@/lib/aiAnalyseDocument";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Leest het geüploade document en laat de AI de kernuitkomsten samenvatten. */
export async function POST(_req: Request, { params }: RouteContext<"/api/analyse-documenten/[id]/samenvatting">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "auth" }, { status: 401 });
  if (!aiBeschikbaar()) return NextResponse.json({ ok: false, reason: "no_key" });

  const { data: doc } = await supabase.from("pws_analyse_documenten").select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const fout = async (reden: string, tekst: string) => {
    await supabase.from("pws_analyse_documenten").update({ status: "fout", samenvatting: tekst }).eq("id", id);
    return NextResponse.json({ ok: false, reason: reden });
  };

  const { data: bestand, error } = await supabase.storage.from("pws-files").download(doc.bestand_pad);
  if (error || !bestand) return fout("download", "Het bestand kon niet worden gelezen.");
  const buffer = Buffer.from(await bestand.arrayBuffer());
  const naam = (doc.bestand_naam as string).toLowerCase();

  let inhoud: { pdf: string } | { tekst: string };
  try {
    if (naam.endsWith(".pdf")) inhoud = { pdf: buffer.toString("base64") };
    else if (naam.endsWith(".docx")) inhoud = { tekst: (await mammoth.extractRawText({ buffer })).value };
    else inhoud = { tekst: buffer.toString("utf8") };
  } catch {
    return fout("lezen", "Het bestand kon niet worden gelezen. Sla het op als PDF en probeer het opnieuw.");
  }

  const [{ data: fase2 }, { data: dv }] = await Promise.all([
    supabase.from("pws_phases").select("veld_data").eq("order_index", 2).maybeSingle(),
    doc.deelvraag_id ? supabase.from("pws_subquestions").select("text").eq("id", doc.deelvraag_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  try {
    const samenvatting = await getAnalyseSamenvatting({
      titel: doc.titel,
      soort: doc.soort,
      auteur: doc.auteur,
      jaar: doc.jaar,
      hoofdvraag: ((fase2?.veld_data ?? {}) as Record<string, string>).hoofdvraag ?? "",
      deelvraag: (dv as { text: string } | null)?.text?.split("\n")[0] ?? null,
      inhoud,
    });
    await supabase.from("pws_analyse_documenten").update({ status: "klaar", samenvatting }).eq("id", id);
    return NextResponse.json({ ok: true, samenvatting });
  } catch (e) {
    console.error("[analyse-document] fout:", e);
    return fout("ai_error", "De samenvatting kon niet worden gemaakt. Probeer het opnieuw.");
  }
}
