import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar } from "@/lib/ai";
import { getOnderzoeksAntwoorden, ONDERZOEK_MODEL } from "@/lib/aiOnderzoek";
import { laadOnderzoek } from "@/lib/onderzoekData";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Laat de AI de hoofd- en deelvragen beantwoorden uit de huidige data en bewaart het resultaat. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "auth" }, { status: 401 });
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  if (!mag) return NextResponse.json({ ok: false, reason: "geen_toegang" }, { status: 403 });
  if (!aiBeschikbaar()) return NextResponse.json({ ok: false, reason: "no_key" });

  const data = await laadOnderzoek(supabase);
  const reacties = data.enquetes.reduce((s, e) => s + e.reacties.length, 0);
  if (!reacties && !data.interviews.length) return NextResponse.json({ ok: false, reason: "geen_data" });

  try {
    const resultaat = await getOnderzoeksAntwoorden(data);
    const basis = {
      enquetes: data.enquetes.map((e) => ({ id: e.id, title: e.title, reacties: e.reacties.length })),
      interviews: data.interviews.length,
    };
    const { error } = await supabase.from("pws_onderzoek_antwoorden").insert({ resultaat, basis, model: ONDERZOEK_MODEL });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[onderzoek-antwoorden] fout:", e);
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 500 });
  }
}
