import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EnqueteBouwer from "@/components/enquete/EnqueteBouwer";
import type { Reactie } from "@/lib/enquete";
import type { Survey, SurveyQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EnqueteDetail({ params }: PageProps<"/enquetes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: survey } = await supabase.from("pws_surveys").select("*").eq("id", id).single();
  if (!survey) notFound();

  const [{ data: questions }, { data: reacties }, { data: phases }] = await Promise.all([
    supabase.from("pws_survey_questions").select("*").eq("survey_id", id).order("order_index"),
    supabase.rpc("pws_enquete_resultaten", { p_survey_id: id }),
    supabase.from("pws_phases").select("id, order_index, title").order("order_index"),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/enquetes" className="text-sm text-slate-500 hover:text-slate-800">
        ← Terug naar enquêtes
      </Link>
      <div className="mt-4">
        <EnqueteBouwer
          survey={survey as Survey}
          initialQuestions={(questions as SurveyQuestion[]) ?? []}
          reacties={(reacties as Reactie[]) ?? []}
          phases={(phases as { id: string; order_index: number; title: string }[]) ?? []}
        />
      </div>
    </main>
  );
}
