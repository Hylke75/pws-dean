import { createClient } from "@/lib/supabase/server";
import EnquetesLijst from "@/components/enquete/EnquetesLijst";
import type { Survey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EnquetesPage() {
  const supabase = await createClient();
  const { data: surveys } = await supabase.from("pws_surveys").select("*").order("created_at", { ascending: false });

  // Aantal reacties per enquête
  const { data: responses } = await supabase.from("pws_survey_responses").select("survey_id");
  const counts: Record<string, number> = {};
  for (const r of responses ?? []) counts[r.survey_id] = (counts[r.survey_id] ?? 0) + 1;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Enquêtes</h1>
      <p className="mt-1 text-slate-500">
        Maak een enquête voor je eigen onderzoek, deel de link, en bekijk de resultaten met grafieken.
      </p>
      <div className="mt-6">
        <EnquetesLijst initial={(surveys as Survey[]) ?? []} counts={counts} />
      </div>
    </main>
  );
}
