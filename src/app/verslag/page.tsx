import { createClient } from "@/lib/supabase/server";
import VerslagClient from "@/components/VerslagClient";
import { toApa } from "@/lib/apa";
import type { VerslagSectie, Source } from "@/lib/types";

export const dynamic = "force-dynamic";

type Vd = Record<string, string>;

export default async function VerslagPage() {
  const supabase = await createClient();
  const [{ data: secties }, { data: phases }, { data: sources }] = await Promise.all([
    supabase.from("pws_verslag_secties").select("*"),
    supabase.from("pws_phases").select("order_index, veld_data"),
    supabase.from("pws_sources").select("*"),
  ]);

  const byOrder = new Map<number, Vd>();
  for (const p of phases ?? []) byOrder.set(p.order_index, (p.veld_data ?? {}) as Vd);
  const vd = (n: number) => byOrder.get(n) ?? {};
  const join = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join("\n\n");

  const src = ((sources as Source[]) ?? [])
    .slice()
    .sort((a, b) => (a.authors || a.title).localeCompare(b.authors || b.title));

  const content: Record<string, string> = {
    inleiding: join(
      vd(2).hoofdvraag && `Hoofdvraag: ${vd(2).hoofdvraag}`,
      vd(2).deelvragen && `Deelvragen:\n${vd(2).deelvragen}`,
      vd(1).afbakening && `Afbakening: ${vd(1).afbakening}`,
    ),
    theorie: vd(4).kernpunten ?? "",
    methode: join(vd(3).eigen_onderzoek, vd(5).instrument, vd(6).uitvoering),
    resultaten: join(vd(7).ordening, vd(7).eerste_analyse),
    analyse: join(vd(8).patronen, vd(9).antwoorden),
    conclusie: join(vd(10).antwoord_hoofdvraag, vd(10).conclusie),
    discussie: join(vd(11).betrouwbaarheid, vd(11).beperkingen, vd(11).vervolg),
    bronnenlijst: src.map(toApa).join("\n\n"),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Eindverslag opbouwen</h1>
        <a
          href="/api/export"
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          ⬇ Exporteer mijn PWS (Word)
        </a>
      </div>
      <p className="mt-1 text-slate-500">
        De onderdelen die in je definitieve verslag horen. Vink af wat klaar is en houd per hoofdstuk
        notities bij. Veel inhoud staat al in de fases — die zie je hier per hoofdstuk terug. Met de
        exportknop bundel je alles (fase-inhoud, bronnen en logboek) tot één Word-startdocument.
      </p>
      <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <p className="font-semibold">Eisen Maerlant-Lyceum</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>Bronvermelding in <strong>APA-stijl</strong>; bronnenlijst op alfabet.</li>
          <li>Conceptversie is <strong>minimaal 15 pagina&apos;s</strong>.</li>
          <li>Resultaten <strong>per deelvraag</strong>, met grafieken/tabellen die je in de tekst uitlegt.</li>
          <li>Bijlagen bevatten o.a. je meetinstrument (de enquête).</li>
        </ul>
        <p className="mt-1 text-emerald-600">Per vak en begeleider kan de nadruk verschillen — stem dit af met je begeleider.</p>
      </div>
      <div className="mt-6">
        <VerslagClient initial={(secties as VerslagSectie[]) ?? []} content={content} />
      </div>
    </main>
  );
}
