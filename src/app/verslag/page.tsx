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
      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Controleer de exacte onderdelen en citeerregels altijd nog in Bijlage 1 van de
        schoolhandleiding — per vak en begeleider kan het iets verschillen.
      </p>
      <div className="mt-6">
        <VerslagClient initial={(data as VerslagSectie[]) ?? []} />
      </div>
    </main>
  );
}
