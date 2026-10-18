import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { naarCsv, naarLangeCsv, type Reactie, type Vraag } from "@/lib/enquete";

export const dynamic = "force-dynamic";

// CSV-download van één enquête: ?vorm=lang geeft één rij per antwoord, anders één rij per invuller.
export async function GET(req: NextRequest, { params }: RouteContext<"/api/enquetes/[id]/download">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log eerst in." }, { status: 401 });

  const { data: survey } = await supabase.from("pws_surveys").select("id, title").eq("id", id).maybeSingle();
  if (!survey) return NextResponse.json({ error: "Enquête niet gevonden." }, { status: 404 });

  const [{ data: vragen }, { data: reacties }] = await Promise.all([
    supabase.from("pws_survey_questions").select("*").eq("survey_id", id).eq("actief", true).order("order_index"),
    supabase.rpc("pws_enquete_resultaten", { p_survey_id: id }),
  ]);

  const lang = req.nextUrl.searchParams.get("vorm") === "lang";
  const v = (vragen as Vraag[]) ?? [];
  const r = (reacties as Reactie[]) ?? [];
  const inhoud = lang ? naarLangeCsv(v, r, id) : naarCsv(v, r, id);
  const naam = `enquete-${survey.title.replace(/[^\w]+/g, "_")}${lang ? "-lang" : ""}.csv`;

  return new Response("﻿" + inhoud, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${naam}"`,
      "Cache-Control": "no-store",
    },
  });
}
