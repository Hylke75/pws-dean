import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EnquetesLijst from "@/components/enquete/EnquetesLijst";
import type { Survey } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EnquetesPage() {
  const supabase = await createClient();
  const { data: surveys } = await supabase.from("pws_surveys").select("*").eq("verborgen", false).order("created_at", { ascending: false });

  // Aantal reacties per enquête
  const counts: Record<string, number> = {};
  await Promise.all(
    (surveys ?? []).map(async (s) => {
      const { count } = await supabase
        .from("pws_survey_responses")
        .select("id", { count: "exact", head: true })
        .eq("survey_id", s.id);
      counts[s.id] = count ?? 0;
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Enquêtes</h1>
        <Link
          href="/enquetes/antwoorden"
          className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
        >
          ✨ Antwoorden op je onderzoeksvragen
        </Link>
      </div>
      <p className="mt-1 text-slate-500">
        Maak een enquête voor je eigen onderzoek, deel de link, en bekijk de resultaten met grafieken.
      </p>
      <div className="mt-6">
        <EnquetesLijst initial={(surveys as Survey[]) ?? []} counts={counts} />
      </div>
    </main>
  );
}
