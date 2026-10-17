import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InterviewInvullen, { type IvOpenData } from "@/components/interviewmodule/InterviewInvullen";
import { GeenToegang } from "@/components/interviewmodule/InterviewTabs";
import type { IvVraag } from "@/lib/interview";

export const dynamic = "force-dynamic";

// Het interview vooraf bekijken zoals een respondent het ziet; er wordt niets opgeslagen.
export default async function InterviewVoorbeeld({ params }: PageProps<"/interviews/voorbeeld/[typeId]">) {
  const { typeId } = await params;
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  if (!mag) return <main className="mx-auto max-w-3xl px-4 py-8"><GeenToegang /></main>;

  const [{ data: type }, { data: vragen }, { data: inst }] = await Promise.all([
    supabase.from("pws_iv_types").select("*").eq("id", typeId).single(),
    supabase.rpc("pws_iv_snapshot", { p_type_id: typeId }),
    supabase.from("pws_iv_instellingen").select("*").eq("id", 1).single(),
  ]);
  if (!type) notFound();

  const data: IvOpenData = {
    status: "uitgenodigd",
    naam: "Voorbeeldnaam",
    functie: "Functie van de respondent",
    organisatie: "Organisatie",
    type_naam: type.naam,
    aanspreekvorm: type.aanspreekvorm,
    intro: type.intro,
    boodschap: "Hier komt je persoonlijke boodschap, als je die invult bij het uitnodigen.",
    vragen: (vragen as IvVraag[]) ?? [],
    antwoorden: {},
    toestemming: null,
    laatst_opgeslagen: null,
    contact_email: inst?.contact_email ?? null,
    ai_aan: !!inst?.ai_analyse_aan,
    bewaartermijn_maanden: inst?.bewaartermijn_maanden ?? 12,
  };
  return <InterviewInvullen voorbeeld={data} />;
}
