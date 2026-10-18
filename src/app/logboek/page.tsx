import { createClient } from "@/lib/supabase/server";
import LogboekClient from "@/components/LogboekClient";
import type { LogEntry, Phase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LogboekPage() {
  const supabase = await createClient();
  const [{ data: logs }, { data: phases }] = await Promise.all([
    supabase.from("pws_logboek").select("*").order("log_date", { ascending: false }),
    supabase.from("pws_phases").select("*").order("order_index"),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Logboek</h1>
      <p className="mt-1 text-slate-500">
        Houd bij waar je aan werkt. De school wil minimaal 80 uur aantoonbaar — bijhouden tijdens
        het PWS, niet achteraf.
      </p>
      <div className="mt-6">
        <LogboekClient initial={(logs as LogEntry[]) ?? []} phases={(phases as Phase[]) ?? []} />
      </div>
    </main>
  );
}
