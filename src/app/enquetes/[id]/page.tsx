import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EnqueteBouwer from "@/components/enquete/EnqueteBouwer";
import type { Survey, SurveyQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EnqueteDetail({ params }: PageProps<"/enquetes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: survey } = await supabase.from("pws_surveys").select("*").eq("id", id).single();
  if (!survey) notFound();

  const [{ data: questions }, { data: responses }, { data: phases }] = await Promise.all([
    supabase.from("pws_survey_questions").select("*").eq("survey_id", id).order("order_index"),
    supabase.from("pws_survey_responses").select("id").eq("survey_id", id),
    supabase.from("pws_phases").select("id, order_index, title").order("order_index"),
  ]);

  const responseIds = (responses ?? []).map((r) => r.id);
  let answers: { question_id: string; value: string | null }[] = [];
  if (responseIds.length) {
    const { data: a } = await supabase
      .from("pws_survey_answers")
      .select("question_id, value")
      .in("response_id", responseIds);
    answers = a ?? [];
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/enquetes" className="text-sm text-slate-500 hover:text-slate-800">
        ← Terug naar enquêtes
      </Link>
      <div className="mt-4">
        <EnqueteBouwer
          survey={survey as Survey}
          initialQuestions={(questions as SurveyQuestion[]) ?? []}
          responseCount={responseIds.length}
          answers={answers}
          phases={(phases as { id: string; order_index: number; title: string }[]) ?? []}
        />
      </div>
    </main>
  );
}
