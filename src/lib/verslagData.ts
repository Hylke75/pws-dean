import type { SupabaseClient } from "@supabase/supabase-js";
import { respondentNummers, vraagTekstVoor, weergave, type IvAntwoord, type IvUitnodiging } from "@/lib/interview";
import type { LogEntry, Source, Subquestion, VerslagSectie } from "@/lib/types";
import type { VerslagEnquete, VerslagInput, VerslagInterview } from "@/lib/verslag";

/** Haalt alles op wat het eindverslag automatisch invult, plus wat de leerling al schreef. */
export async function laadVerslag(supabase: SupabaseClient): Promise<{ input: VerslagInput; secties: VerslagSectie[] }> {
  const [
    { data: secties },
    { data: phases },
    { data: sources },
    { data: subs },
    { data: logs },
    { data: surveys },
    { data: responses },
    { data: questions },
    { data: student },
    { data: alleIv },
  ] = await Promise.all([
    supabase.from("pws_verslag_secties").select("*"),
    supabase.from("pws_phases").select("id, order_index, veld_data, deadline"),
    supabase.from("pws_sources").select("*"),
    supabase.from("pws_subquestions").select("*").order("order_index"),
    supabase.from("pws_logboek").select("*"),
    supabase.from("pws_surveys").select("id, title, created_at").order("created_at"),
    supabase.from("pws_survey_responses").select("survey_id"),
    supabase.from("pws_survey_questions").select("survey_id").eq("actief", true),
    supabase.from("pws_profiles").select("full_name").eq("role", "student").limit(1).maybeSingle(),
    supabase.from("pws_iv_uitnodigingen").select("id, created_at"),
  ]);

  const veldData: VerslagInput["veldData"] = {};
  const faseIds: Record<number, string> = {};
  let inleverdatum: string | null = null;
  for (const p of phases ?? []) {
    veldData[p.order_index] = (p.veld_data ?? {}) as Record<string, string>;
    faseIds[p.order_index] = p.id;
    if (p.order_index === 11) inleverdatum = p.deadline;
  }

  const tel = (rows: { survey_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.survey_id === id).length;
  // Oude versies en de voorbeeldenquête horen niet in het verslag.
  const enquetes: VerslagEnquete[] = (surveys ?? [])
    .filter((s) => !/^oud/i.test(s.title) && !/data 2/i.test(s.title))
    .map((s) => ({ id: s.id, title: s.title, reacties: tel(responses, s.id), vragen: tel(questions, s.id) }));

  const { data: ivData } = await supabase
    .from("pws_iv_uitnodigingen")
    .select("id, type_naam, naam, functie, organisatie, vragen, status, toestemming, created_at, taal")
    .eq("gearchiveerd", false)
    .eq("status", "afgerond")
    .order("created_at");
  const afgerond = (ivData as unknown as IvUitnodiging[]) ?? [];
  const { data: antw } = afgerond.length
    ? await supabase.from("pws_iv_antwoorden").select("uitnodiging_id, vraag_key, antwoord").in("uitnodiging_id", afgerond.map((u) => u.id))
    : { data: [] };
  const nummers = respondentNummers((alleIv as { id: string; created_at: string }[]) ?? []);
  const interviews: VerslagInterview[] = afgerond.map((u) => ({
    label: weergave(u, nummers.get(u.id) ?? 0, false).label,
    type: u.type_naam,
    antwoorden: (u.vragen ?? [])
      .map((v) => ({
        vraag: vraagTekstVoor(u, v),
        antwoord: ((antw as IvAntwoord[]) ?? []).find((a) => a.uitnodiging_id === u.id && a.vraag_key === v.key)?.antwoord ?? "",
      }))
      .filter((a) => a.antwoord.trim()),
  }));

  return {
    secties: (secties as VerslagSectie[]) ?? [],
    input: {
      veldData,
      deelvragen: (subs as Subquestion[]) ?? [],
      bronnen: (sources as Source[]) ?? [],
      logboek: (logs as LogEntry[]) ?? [],
      enquetes,
      interviews,
      naam: student?.full_name ?? null,
      inleverdatum,
      faseIds,
    },
  };
}
