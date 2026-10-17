import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar } from "@/lib/ai";
import { controleerAiAnalyse, type IvAntwoord, type IvUitnodiging } from "@/lib/interview";
import { IV_AI_MODEL, maakInterviewAnalyse, type AiInvoerRespondent } from "@/lib/interviewAi";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  if (!mag) return NextResponse.json({ error: "Geen toegang." }, { status: 401 });
  if (!aiBeschikbaar()) return NextResponse.json({ error: "Er is geen AI-koppeling ingesteld." }, { status: 400 });
  const { data: inst } = await supabase.from("pws_iv_instellingen").select("ai_analyse_aan").eq("id", 1).single();
  if (!inst?.ai_analyse_aan) return NextResponse.json({ error: "De AI-analyse staat uit (zie Privacy en instellingen)." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { thema?: unknown; ids?: unknown } | null;
  const thema = typeof body?.thema === "string" ? body.thema : "";
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 60) : [];
  if (!thema || !ids.length) return NextResponse.json({ error: "Kies een thema en minstens één respondent." }, { status: 400 });

  const [{ data: themaRij }, { data: uitn }, { data: antw }] = await Promise.all([
    supabase.from("pws_iv_themas").select("naam").eq("key", thema).maybeSingle(),
    supabase.from("pws_iv_uitnodigingen").select("id, type_naam, vragen, toestemming, created_at").in("id", ids).order("created_at"),
    supabase.from("pws_iv_antwoorden").select("uitnodiging_id, vraag_key, antwoord").in("uitnodiging_id", ids),
  ]);
  if (!themaRij) return NextResponse.json({ error: "Onbekend thema." }, { status: 400 });

  // Alleen respondenten die uitdrukkelijk toestemming gaven voor AI-verwerking.
  const metToestemming = ((uitn as IvUitnodiging[]) ?? []).filter((u) => u.toestemming?.ai === true);
  const antwoorden = (antw as IvAntwoord[]) ?? [];
  const pseudoniemen: Record<string, string> = {};
  const invoer: AiInvoerRespondent[] = [];
  const bronnen = new Map<string, Map<string, string>>();
  const citeerbaar = new Set<string>();

  for (const u of metToestemming) {
    const rij = u.vragen
      .filter((v) => v.themas.includes(thema))
      .map((v) => ({
        vraag_key: v.key,
        vraag: v.tekst,
        antwoord: (antwoorden.find((a) => a.uitnodiging_id === u.id && a.vraag_key === v.key)?.antwoord ?? "").trim(),
      }))
      .filter((a) => a.antwoord);
    if (!rij.length) continue;
    const ps = `R${invoer.length + 1}`;
    pseudoniemen[ps] = u.id;
    const magCiteren = !!u.toestemming?.citeren;
    invoer.push({ pseudoniem: ps, type_naam: u.type_naam, magCiteren, antwoorden: rij });
    const kaart = new Map(rij.map((a) => [a.vraag_key, a.antwoord]));
    bronnen.set(ps, kaart);
    if (magCiteren) citeerbaar.add(ps);
  }

  if (!invoer.length) {
    return NextResponse.json(
      { error: "Geen van de gekozen respondenten gaf toestemming voor AI-analyse én beantwoordde vragen binnen dit thema." },
      { status: 400 },
    );
  }

  let ruw;
  try {
    ruw = await maakInterviewAnalyse(themaRij.naam, invoer);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "De AI-analyse is mislukt." }, { status: 502 });
  }

  // Punten zonder echte bron en citaten die niet letterlijk voorkomen (of niet geciteerd mogen worden) vervallen.
  const gecontroleerd = controleerAiAnalyse(ruw, bronnen);
  const citaten = gecontroleerd.analyse.citaten.filter((c) => citeerbaar.has(c.respondent));
  const analyse = { ...gecontroleerd.analyse, citaten };
  const verwijderd = gecontroleerd.verwijderd + gecontroleerd.analyse.citaten.length - citaten.length;

  const { data: opgeslagen, error } = await supabase
    .from("pws_iv_analyses")
    .insert({
      thema,
      uitnodiging_ids: invoer.map((r) => pseudoniemen[r.pseudoniem]),
      resultaat: { analyse, pseudoniemen, verwijderd },
      model: IV_AI_MODEL,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Opslaan van de analyse lukte niet." }, { status: 500 });
  return NextResponse.json({ id: opgeslagen.id });
}
