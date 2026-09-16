import { createClient } from "@/lib/supabase/server";
import BronnenClient from "@/components/BronnenClient";
import type { Source, Phase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BronnenPage() {
  const supabase = await createClient();
  const [{ data: sources }, { data: phases }] = await Promise.all([
    supabase.from("pws_sources").select("*").order("created_at"),
    supabase.from("pws_phases").select("*").order("order_index"),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Bronnen</h1>
      <p className="mt-1 text-slate-500">
        Verzamel al je bronnen meteen — dan is je bronvermelding straks zo klaar.
      </p>
      <div className="mt-6">
        <BronnenClient initial={(sources as Source[]) ?? []} phases={(phases as Phase[]) ?? []} />
      </div>
    </main>
  );
}
