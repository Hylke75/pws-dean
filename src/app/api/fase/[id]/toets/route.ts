import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar, getPhaseFeedback } from "@/lib/ai";
import type { Phase, ToetsCriterium, Attachment, Source } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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

  const { data: phase } = await supabase.from("pws_phases").select("*").eq("id", id).single();
  if (!phase) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  const p = phase as Phase;

  const [{ data: criteria }, { data: attachments }, { data: sources }] = await Promise.all([
    supabase.from("pws_toets_criteria").select("*").eq("phase_id", id).order("order_index"),
    supabase.from("pws_attachments").select("*").eq("phase_id", id),
    supabase.from("pws_sources").select("*").eq("phase_id", id),
  ]);

  try {
    const data = await getPhaseFeedback({
      faseTitel: p.title,
      faseNummer: p.order_index,
      faseOmschrijving: p.description,
      criteria: ((criteria as ToetsCriterium[]) ?? []).map((c) => c.text),
      uitwerking: p.notes ?? "",
      materiaal: ((attachments as Attachment[]) ?? []).map((a) => a.label),
      bronnen: ((sources as Source[]) ?? []).map((s) => s.title),
    });

    await supabase.from("pws_ai_feedback").insert({
      phase_id: id,
      verdict: data.verdict,
      data,
      model: "claude-opus-4-8",
    });

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[toets] AI-fout:", e);
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 500 });
  }
}
