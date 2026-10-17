import { createClient } from "@/lib/supabase/server";
import InterviewTabs, { GeenToegang } from "@/components/interviewmodule/InterviewTabs";
import InterviewExport, { type ExportRij } from "@/components/interviewmodule/InterviewExport";

export const dynamic = "force-dynamic";

export default async function InterviewExportPage() {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  const { data } = await supabase
    .from("pws_iv_uitnodigingen")
    .select("id, naam, type_naam, status, afgerond_op, toestemming")
    .eq("gearchiveerd", false)
    .in("status", ["gestart", "afgerond"])
    .order("created_at");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
      <p className="mt-1 text-slate-500">Download de interviews voor je profielwerkstuk, met de vraagtekst die de respondent te zien kreeg.</p>
      <InterviewTabs actief="export" />
      {mag ? <InterviewExport rijen={(data as ExportRij[]) ?? []} /> : <GeenToegang />}
    </main>
  );
}
