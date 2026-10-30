import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnderzoeksAntwoorden } from "@/lib/onderzoek";

/** De laatste analyse wordt bewaard bij de verslaggegevens, onder een eigen sleutel. */
const SLEUTEL = "_onderzoek_antwoorden";

export type Basis = { enquetes: { id: string; title: string; reacties: number }[]; interviews: number; documenten?: number };
export type OpgeslagenAnalyse = { resultaat: OnderzoeksAntwoorden; basis: Basis; model: string; gemaakt_op: string };

export async function laadAnalyse(supabase: SupabaseClient): Promise<OpgeslagenAnalyse | null> {
  const { data } = await supabase.from("pws_verslag_secties").select("notes").eq("section_key", SLEUTEL).maybeSingle();
  if (!data?.notes) return null;
  try {
    const a = JSON.parse(data.notes) as OpgeslagenAnalyse;
    return a?.resultaat?.deelvragen && a.basis ? a : null;
  } catch {
    return null;
  }
}

export async function bewaarAnalyse(supabase: SupabaseClient, a: OpgeslagenAnalyse) {
  return supabase
    .from("pws_verslag_secties")
    .upsert({ section_key: SLEUTEL, status: "klaar", notes: JSON.stringify(a) }, { onConflict: "section_key" });
}
