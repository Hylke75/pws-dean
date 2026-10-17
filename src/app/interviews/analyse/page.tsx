import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar } from "@/lib/ai";
import { respondentNummers, type IvAntwoord, type IvThema, type IvUitnodiging } from "@/lib/interview";
import InterviewTabs, { GeenToegang } from "@/components/interviewmodule/InterviewTabs";
import InterviewAnalyse, { type OpgeslagenAnalyse } from "@/components/interviewmodule/InterviewAnalyse";

export const dynamic = "force-dynamic";

const KOLOMMEN = "id, type_id, type_naam, naam, functie, organisatie, vragen, status, gearchiveerd, toestemming, afgerond_op, created_at";

export default async function InterviewAnalysePage() {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  const [{ data: alle }, { data: uitn }, { data: themas }, { data: inst }, { data: analyses }] = await Promise.all([
    supabase.from("pws_iv_uitnodigingen").select("id, created_at"),
    supabase.from("pws_iv_uitnodigingen").select(KOLOMMEN).eq("gearchiveerd", false).in("status", ["gestart", "afgerond"]).order("created_at"),
    supabase.from("pws_iv_themas").select("*").order("order_index"),
    supabase.from("pws_iv_instellingen").select("ai_analyse_aan").eq("id", 1).maybeSingle(),
    supabase.from("pws_iv_analyses").select("id, thema, uitnodiging_ids, resultaat, model, beoordeeld, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const lijst = (uitn as unknown as IvUitnodiging[]) ?? [];
  const { data: antw } = lijst.length
    ? await supabase.from("pws_iv_antwoorden").select("uitnodiging_id, vraag_key, antwoord, bijgewerkt_op").in("uitnodiging_id", lijst.map((u) => u.id))
    : { data: [] };
  const nummers = respondentNummers((alle as { id: string; created_at: string }[]) ?? []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
      <p className="mt-1 text-slate-500">Vergelijk per thema wat verschillende respondenten antwoordden.</p>
      <InterviewTabs actief="analyse" />
      {mag ? (
        <InterviewAnalyse
          uitnodigingen={lijst}
          antwoorden={(antw as IvAntwoord[]) ?? []}
          themas={(themas as IvThema[]) ?? []}
          nummers={Object.fromEntries(nummers)}
          aiAan={aiBeschikbaar() && !!inst?.ai_analyse_aan}
          analyses={(analyses as OpgeslagenAnalyse[]) ?? []}
        />
      ) : (
        <GeenToegang />
      )}
    </main>
  );
}
