import { createClient } from "@/lib/supabase/server";
import InterviewTabs, { GeenToegang } from "@/components/interviewmodule/InterviewTabs";
import VragenBeheer from "@/components/interviewmodule/VragenBeheer";
import type { IvThema, IvType, IvVraagBron } from "@/lib/interview";

export const dynamic = "force-dynamic";

export default async function InterviewVragenPage() {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  const [{ data: types }, { data: algemeen }, { data: themas }, { data: set }] = await Promise.all([
    supabase.from("pws_iv_types").select("*").order("order_index"),
    supabase.from("pws_iv_vragen").select("*").eq("algemeen", true).eq("actief", true).order("key"),
    supabase.from("pws_iv_themas").select("*").order("order_index"),
    supabase.from("pws_iv_set").select("type_id"),
  ]);
  const aantal: Record<string, number> = {};
  for (const s of (set as { type_id: string }[]) ?? []) aantal[s.type_id] = (aantal[s.type_id] ?? 0) + 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
      <p className="mt-1 text-slate-500">Stel per doelgroep de vragen samen. Algemene vragen beheer je op één plek; ze komen in elk interviewtype terug.</p>
      <InterviewTabs actief="vragen" />
      {mag ? (
        <VragenBeheer
          types={(types as IvType[]) ?? []}
          algemeen={(algemeen as IvVraagBron[]) ?? []}
          themas={(themas as IvThema[]) ?? []}
          aantal={aantal}
        />
      ) : (
        <GeenToegang />
      )}
    </main>
  );
}
