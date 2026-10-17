import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InterviewTabs, { GeenToegang } from "@/components/interviewmodule/InterviewTabs";
import TypeBewerker, { type SetItem } from "@/components/interviewmodule/TypeBewerker";
import type { IvThema, IvType, IvVraagBron } from "@/lib/interview";

export const dynamic = "force-dynamic";

export default async function InterviewTypePage({ params }: PageProps<"/interviews/vragen/[typeId]">) {
  const { typeId } = await params;
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  if (!mag) return <main className="mx-auto max-w-3xl px-4 py-8"><GeenToegang /></main>;

  const [{ data: type }, { data: set }, { data: algemeen }, { data: themas }] = await Promise.all([
    supabase.from("pws_iv_types").select("*").eq("id", typeId).single(),
    supabase.from("pws_iv_set").select("vraag_id, order_index, verplicht, vraag:pws_iv_vragen(*)").eq("type_id", typeId).order("order_index"),
    supabase.from("pws_iv_vragen").select("*").eq("algemeen", true).eq("actief", true).order("key"),
    supabase.from("pws_iv_themas").select("*").order("order_index"),
  ]);
  if (!type) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/interviews/vragen" className="text-sm text-slate-500 hover:text-slate-800">← Alle interviewtypen</Link>
      <InterviewTabs actief="vragen" />
      <TypeBewerker
        type={type as IvType}
        set={((set ?? []) as unknown as SetItem[]).filter((s) => s.vraag)}
        algemeen={(algemeen as IvVraagBron[]) ?? []}
        themas={(themas as IvThema[]) ?? []}
      />
    </main>
  );
}
