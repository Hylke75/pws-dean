import { createClient } from "@/lib/supabase/server";
import VerslagClient from "@/components/VerslagClient";
import { bouwVerslag } from "@/lib/verslag";
import { laadVerslag } from "@/lib/verslagData";
import { aiBeschikbaar } from "@/lib/ai";
import { getSession } from "@/lib/session";
import type { Opmerking } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VerslagPage() {
  const supabase = await createClient();
  const [{ input, secties }, { user, profile }, { data: opmerkingen }] = await Promise.all([
    laadVerslag(supabase),
    getSession(),
    supabase.from("pws_verslag_opmerkingen").select("*").order("created_at"),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Eindverslag</h1>
        <a
          href="/api/export"
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          ⬇ Exporteer mijn PWS (Word)
        </a>
      </div>
      <p className="mt-1 text-slate-500">
        De opbouw van je profielwerkstuk, hoofdstuk voor hoofdstuk. Wat al in het systeem staat, is
        automatisch ingevuld (groen). Wat je nog moet schrijven, staat in de gele vakken: je typt het
        hier direct in, met opmaak, en het wordt vanzelf opgeslagen. Kom je niet verder? Laat de AI je
        een paar vragen stellen en je tekst herschrijven. Met de exportknop krijg je alles als Word-document.
      </p>
      <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <p className="font-semibold">Eisen Maerlant-Lyceum</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>Bronvermelding in <strong>APA-stijl</strong>; bronnenlijst op alfabet.</li>
          <li>Conceptversie is <strong>minimaal 15 pagina&apos;s</strong>.</li>
          <li>Resultaten <strong>per deelvraag</strong>, met grafieken of tabellen die je in de tekst uitlegt.</li>
          <li>Bijlagen bevatten onder andere je meetinstrument (enquête en interviewvragen).</li>
        </ul>
      </div>
      <div className="mt-6">
        <VerslagClient
          hoofdstukken={bouwVerslag(input)}
          initial={secties}
          aiAan={aiBeschikbaar()}
          rol={profile?.role ?? "student"}
          mijnId={user?.id ?? null}
          opmerkingen={(opmerkingen as Opmerking[]) ?? []}
        />
      </div>
    </main>
  );
}
