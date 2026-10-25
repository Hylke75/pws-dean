import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar } from "@/lib/ai";
import { getHerschrijving, getSchrijfVragen, type SchrijfhulpInput } from "@/lib/aiSchrijfhulp";
import { bouwVerslag } from "@/lib/verslag";
import { laadVerslag } from "@/lib/verslagData";
import { naarTekst } from "@/lib/opmaak";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Verzoek = {
  stap?: unknown;
  veld?: unknown;
  tekst?: unknown;
  antwoorden?: unknown;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "auth" }, { status: 401 });
  if (!aiBeschikbaar()) return NextResponse.json({ ok: false, reason: "no_key" });

  const body = (await req.json().catch(() => ({}))) as Verzoek;
  const stap = body.stap === "herschrijf" ? "herschrijf" : "vragen";
  const veldKey = typeof body.veld === "string" ? body.veld : "";
  const tekst = typeof body.tekst === "string" ? naarTekst(body.tekst).slice(0, 20000) : "";

  // De context haalt de server zelf op, zodat de AI alleen Deans eigen materiaal ziet.
  const { input } = await laadVerslag(supabase);
  const hoofdstuk = bouwVerslag(input).find((h) => h.schrijven.some((f) => f.key === veldKey));
  const veld = hoofdstuk?.schrijven.find((f) => f.key === veldKey);
  if (!hoofdstuk || !veld) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const hulp: SchrijfhulpInput = {
    hoofdvraag: input.veldData[2]?.hoofdvraag ?? "",
    hoofdstuk: hoofdstuk.nummer ? `${hoofdstuk.nummer} ${hoofdstuk.titel}` : hoofdstuk.titel,
    onderdeel: veld.label,
    hint: veld.hint,
    context: hoofdstuk.auto.map((b) => `${b.titel}\n${b.tekst}`).join("\n\n"),
    tekst,
  };

  try {
    if (stap === "vragen") return NextResponse.json({ ok: true, vragen: await getSchrijfVragen(hulp) });
    const qa = Array.isArray(body.antwoorden)
      ? body.antwoorden
          .filter((x): x is { vraag: string; antwoord: string } => typeof x?.vraag === "string" && typeof x?.antwoord === "string")
          .slice(0, 8)
          .map((x) => ({ vraag: x.vraag.slice(0, 500), antwoord: x.antwoord.slice(0, 3000) }))
      : [];
    return NextResponse.json({ ok: true, html: await getHerschrijving(hulp, qa) });
  } catch (e) {
    console.error("[verslag-schrijfhulp] fout:", e);
    return NextResponse.json({ ok: false, reason: "ai_error" }, { status: 500 });
  }
}
