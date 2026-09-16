import { createClient } from "@/lib/supabase/server";
import InterviewsLijst from "@/components/interview/InterviewsLijst";
import type { Interview } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("pws_interviews").select("*").order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
      <p className="mt-1 text-slate-500">
        Werk je interviews uit: wie je sprak, en per vraag het antwoord. Handig voor je onderzoeksmethode
        en als bijlage.
      </p>
      <div className="mt-6">
        <InterviewsLijst initial={(data as Interview[]) ?? []} />
      </div>
    </main>
  );
}
