import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar, getBronSamenvatting } from "@/lib/ai";
import type { Source, Phase, Subquestion } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SOORT_LABELS: Record<Source["source_type"], string> = {
  website: "Website",
  boek: "Boek",
  artikel: "Artikel",
  video: "Video",
  interview: "Interview",
  overig: "Overig",
};

/** Haalt een URL op en maakt er ruwe platte tekst van. Faalt stil (null) bij problemen. */
async function haalPaginaTekst(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PWS-tracker/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("text/plain")) return null;
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
      .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 14000);
  } catch {
    return null;
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "auth" }, { status: 401 });

  if (!aiBeschikbaar()) {
    return NextResponse.json({ ok: false, reason: "no_key" });
  }

  const { data: source } = await supabase.from("pws_sources").select("*").eq("id", id).single();
  if (!source) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  const s = source as Source;

  // Context: hoofdvraag (fase 2) en gekoppelde deelvraag.
  const [{ data: fase2 }, { data: deelvraag }] = await Promise.all([
    supabase.from("pws_phases").select("veld_data").eq("order_index", 2).maybeSingle(),
    s.subquestion_id
      ? supabase.from("pws_subquestions").select("*").eq("id", s.subquestion_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const hoofdvraag = ((fase2 as Pick<Phase, "veld_data"> | null)?.veld_data ?? {})["hoofdvraag"] ?? null;
  const deelvraagTekst = (deelvraag as Subquestion | null)?.text ?? null;

  const paginaTekst = s.url ? await haalPaginaTekst(s.url) : null;

  try {
    const samenvatting = await getBronSamenvatting({
      soort: SOORT_LABELS[s.source_type],
      titel: s.title,
      auteurs: s.authors,
      jaar: s.year,
      uitgever: s.publisher,
      url: s.url,
      paginaTekst,
      hoofdvraag,
      deelvraag: deelvraagTekst,
    });

    await supabase.from("pws_sources").update({ summary: samenvatting }).eq("id", id);

    return NextResponse.json({ ok: true, summary: samenvatting, hadContent: !!paginaTekst });
  } catch (e) {
    console.error("[bron-samenvatting] fout:", e);
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 500 });
  }
}
