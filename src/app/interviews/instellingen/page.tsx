import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar } from "@/lib/ai";
import InterviewTabs, { GeenToegang } from "@/components/interviewmodule/InterviewTabs";
import InterviewInstellingen from "@/components/interviewmodule/InterviewInstellingen";

export const dynamic = "force-dynamic";

export default async function InterviewInstellingenPage() {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  const [{ data: inst }, { count: verlopen }] = await Promise.all([
    supabase.from("pws_iv_instellingen").select("*").eq("id", 1).single(),
    supabase.from("pws_iv_uitnodigingen").select("id", { count: "exact", head: true }).lt("bewaren_tot", new Date().toISOString().slice(0, 10)),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
      <p className="mt-1 text-slate-500">Privacy, bewaartermijn en de optionele AI-analyse.</p>
      <InterviewTabs actief="instellingen" />
      {mag && inst ? (
        <InterviewInstellingen
          begin={{ bewaartermijn_maanden: inst.bewaartermijn_maanden, contact_email: inst.contact_email ?? "", ai_analyse_aan: inst.ai_analyse_aan }}
          aiKoppeling={aiBeschikbaar()}
          verlopen={verlopen ?? 0}
        />
      ) : (
        <GeenToegang />
      )}
    </main>
  );
}
