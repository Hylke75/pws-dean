import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reactie } from "@/lib/enquete";
import { respondentNummers, vraagTekstVoor, weergave, type IvAntwoord, type IvUitnodiging } from "@/lib/interview";
import { isEchteEnquete, type OnderzoekBron, type OnderzoekEnquete, type OnderzoekInterview } from "@/lib/onderzoek";
import { apaInTekst } from "@/lib/apa";
import { verdeelKernpunten } from "@/lib/verslag";
import type { Source, Subquestion, SurveyQuestion } from "@/lib/types";

export type OnderzoekData = {
  hoofdvraag: string;
  deelvragen: Subquestion[];
  enquetes: OnderzoekEnquete[];
  interviews: OnderzoekInterview[];
  /** afgeronde interviews die niet mee mogen in de AI-analyse */
  zonderToestemming: number;
  bronnen: OnderzoekBron[];
  /** aantekeningen uit fase 4, per deelvraag */
  aantekeningen: Record<number, string[]>;
};

/** Alle eigen onderzoeksdata: echte enquêtes met reacties en afgeronde interviews met toestemming voor AI. */
export async function laadOnderzoek(supabase: SupabaseClient): Promise<OnderzoekData> {
  const [{ data: fase2 }, { data: subs }, { data: surveys }, { data: inst }, { data: alleIv }, { data: fase4 }, { data: bronRijen }] = await Promise.all([
    supabase.from("pws_phases").select("veld_data").eq("order_index", 2).maybeSingle(),
    supabase.from("pws_subquestions").select("*").order("order_index"),
    supabase.from("pws_surveys").select("id, title, slug, created_at").eq("verborgen", false).order("created_at"),
    supabase.from("pws_iv_instellingen").select("ai_analyse_aan").eq("id", 1).maybeSingle(),
    supabase.from("pws_iv_uitnodigingen").select("id, created_at"),
    supabase.from("pws_phases").select("veld_data").eq("order_index", 4).maybeSingle(),
    supabase.from("pws_sources").select("title, authors, year, publisher, summary, subquestion_id"),
  ]);
  const deelvragen = (subs as Subquestion[]) ?? [];
  const dvNummer = (id: string | null) => {
    const i = deelvragen.findIndex((d) => d.id === id);
    return i >= 0 ? i + 1 : null;
  };
  const bronnen: OnderzoekBron[] = ((bronRijen as Source[]) ?? []).map((b) => ({
    inTekst: apaInTekst(b),
    titel: b.title,
    samenvatting: b.summary ?? "",
    deelvraag: dvNummer(b.subquestion_id),
  }));
  const aantekeningen = verdeelKernpunten(((fase4?.veld_data ?? {}) as Record<string, string>).kernpunten ?? "").perDeelvraag;

  const volgorde = ["leerlingen", "docenten", "werknemers"];
  const plek = (s: { slug: string | null }) => volgorde.indexOf(s.slug ?? "") + 1 || volgorde.length + 1;
  const echte = ((surveys as { id: string; title: string; slug: string | null }[]) ?? [])
    .filter((s) => isEchteEnquete(s.title))
    .sort((a, b) => plek(a) - plek(b));

  const enquetes: OnderzoekEnquete[] = await Promise.all(
    echte.map(async (s) => {
      const [{ data: vragen }, { data: reacties }] = await Promise.all([
        supabase.from("pws_survey_questions").select("*").eq("survey_id", s.id).eq("actief", true).order("order_index"),
        supabase.rpc("pws_enquete_resultaten", { p_survey_id: s.id }),
      ]);
      return { id: s.id, title: s.title, vragen: (vragen as SurveyQuestion[]) ?? [], reacties: (reacties as Reactie[]) ?? [] };
    }),
  );

  const { data: ivData } = await supabase
    .from("pws_iv_uitnodigingen")
    .select("id, type_naam, naam, functie, organisatie, vragen, status, toestemming, created_at, taal")
    .eq("gearchiveerd", false)
    .eq("status", "afgerond")
    .order("created_at");
  const afgerond = (ivData as unknown as IvUitnodiging[]) ?? [];
  // Alleen interviews waarvoor de respondent toestemming gaf voor AI, en alleen als AI-analyse aan staat.
  const metToestemming = inst?.ai_analyse_aan ? afgerond.filter((u) => u.toestemming?.ai) : [];
  const { data: antw } = metToestemming.length
    ? await supabase.from("pws_iv_antwoorden").select("uitnodiging_id, vraag_key, antwoord").in("uitnodiging_id", metToestemming.map((u) => u.id))
    : { data: [] };
  const nummers = respondentNummers((alleIv as { id: string; created_at: string }[]) ?? []);
  const interviews: OnderzoekInterview[] = metToestemming.map((u) => {
    const w = weergave(u, nummers.get(u.id) ?? 0, false);
    return {
      label: w.label,
      type: u.type_naam,
      magCiteren: w.magCiteren,
      antwoorden: (u.vragen ?? [])
        .map((v) => ({
          vraag: vraagTekstVoor(u, v),
          antwoord: ((antw as IvAntwoord[]) ?? []).find((a) => a.uitnodiging_id === u.id && a.vraag_key === v.key)?.antwoord ?? "",
        }))
        .filter((a) => a.antwoord.trim()),
    };
  });

  return {
    hoofdvraag: ((fase2?.veld_data ?? {}) as Record<string, string>).hoofdvraag ?? "",
    deelvragen,
    enquetes,
    interviews,
    zonderToestemming: afgerond.length - metToestemming.length,
    bronnen,
    aantekeningen,
  };
}
