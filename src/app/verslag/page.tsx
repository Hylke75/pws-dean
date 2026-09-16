import { createClient } from "@/lib/supabase/server";
import VerslagClient from "@/components/VerslagClient";
import type { VerslagSectie } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VerslagPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("pws_verslag_secties").select("*");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Eindverslag opbouwen</h1>
      <p className="mt-1 text-slate-500">
        De onderdelen die in je definitieve verslag horen. Vink af wat klaar is en houd per hoofdstuk
        notities bij. Veel inhoud staat al in de fases — die haal je hier bij elkaar.
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
        <VerslagClient initial={(data as VerslagSectie[]) ?? []} />
      </div>
    </main>
  );
}
