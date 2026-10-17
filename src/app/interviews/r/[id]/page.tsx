import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InterviewTabs, { GeenToegang } from "@/components/interviewmodule/InterviewTabs";
import InterviewBeheerDetail from "@/components/interviewmodule/InterviewBeheerDetail";
import type { IvAntwoord, IvThema, IvUitnodiging } from "@/lib/interview";

export const dynamic = "force-dynamic";

export default async function InterviewRespondent({ params }: PageProps<"/interviews/r/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  if (!mag) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <GeenToegang />
      </main>
    );
  }

  const [{ data: u }, { data: antwoorden }, { data: themas }] = await Promise.all([
    supabase.from("pws_iv_uitnodigingen").select("*").eq("id", id).single(),
    supabase.from("pws_iv_antwoorden").select("*").eq("uitnodiging_id", id),
    supabase.from("pws_iv_themas").select("*").order("order_index"),
  ]);
  if (!u) notFound();
  const { token_hash, ...rest } = u as IvUitnodiging & { token_hash: string | null };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/interviews" className="text-sm text-slate-500 hover:text-slate-800">← Terug naar interviews</Link>
      <InterviewTabs actief="overzicht" />
      <InterviewBeheerDetail
        u={rest}
        heeftLink={!!token_hash}
        antwoorden={(antwoorden as IvAntwoord[]) ?? []}
        themas={(themas as IvThema[]) ?? []}
      />
    </main>
  );
}
