import { createClient } from "@/lib/supabase/server";
import InterviewsLijst from "@/components/interview/InterviewsLijst";
import InterviewTabs, { GeenToegang } from "@/components/interviewmodule/InterviewTabs";
import InterviewOverzicht, { type OverzichtRij } from "@/components/interviewmodule/InterviewOverzicht";
import type { IvType } from "@/lib/interview";
import type { Interview } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const supabase = await createClient();
  const [{ data: mag }, { data: handmatig }, { data: rijen }, { data: types }] = await Promise.all([
    supabase.rpc("pws_iv_mag_beheren"),
    supabase.from("pws_interviews").select("*").order("created_at", { ascending: false }),
    supabase
      .from("pws_iv_uitnodigingen")
      .select("id, type_id, type_naam, naam, functie, organisatie, status, gearchiveerd, uitgenodigd_op, laatste_activiteit, afgerond_op, created_at, taal")
      .order("created_at", { ascending: false }),
    supabase.from("pws_iv_types").select("*").eq("status", "gepubliceerd").eq("gearchiveerd", false).order("order_index"),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
      <p className="mt-1 text-slate-500">
        Nodig deskundigen uit voor een digitaal interview, volg wie heeft gereageerd en analyseer de antwoorden.
      </p>
      <InterviewTabs actief="overzicht" />
      {mag ? <InterviewOverzicht rijen={(rijen as OverzichtRij[]) ?? []} types={(types as IvType[]) ?? []} /> : <GeenToegang />}

      <section className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-semibold text-slate-900">Zelf uitgewerkte interviews</h2>
        <p className="mt-1 text-sm text-slate-500">
          Interviews die je zelf hebt afgenomen en uitgewerkt: wie je sprak, en per vraag het antwoord.
        </p>
        <div className="mt-4">
          <InterviewsLijst initial={(handmatig as Interview[]) ?? []} />
        </div>
      </section>
    </main>
  );
}
