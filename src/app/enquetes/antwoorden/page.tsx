import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { aiBeschikbaar } from "@/lib/ai";
import { laadOnderzoek } from "@/lib/onderzoekData";
import { vraagRefs } from "@/lib/onderzoek";
import { laadAnalyse } from "@/lib/onderzoekOpslag";
import OnderzoekAntwoorden from "@/components/onderzoek/OnderzoekAntwoorden";
import { GeenToegang } from "@/components/interviewmodule/InterviewTabs";

export const dynamic = "force-dynamic";

export default async function AntwoordenPage() {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  const [data, laatste] = await Promise.all([laadOnderzoek(supabase), laadAnalyse(supabase)]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        <Link href="/enquetes" className="hover:text-slate-800">← Enquêtes</Link>
        <Link href="/interviews" className="hover:text-slate-800">← Interviews</Link>
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Antwoorden op je onderzoeksvragen</h1>
      <p className="mt-1 text-slate-500">
        Wat zeggen je enquêtes, interviews en bronnen over je hoofdvraag en deelvragen? De AI schrijft een eerste
        antwoord; de grafieken en cijfers komen rechtstreeks uit je data.
      </p>
      {mag ? (
        <OnderzoekAntwoorden
          hoofdvraag={data.hoofdvraag}
          deelvragen={data.deelvragen.map((d) => d.text)}
          enquetes={data.enquetes}
          refs={vraagRefs(data.enquetes)}
          interviews={data.interviews.length}
          documenten={data.documenten.length}
          zonderToestemming={data.zonderToestemming}
          resultaat={laatste?.resultaat ?? null}
          basis={laatste?.basis ?? null}
          gemaaktOp={laatste?.gemaakt_op ?? null}
          aiAan={aiBeschikbaar()}
        />
      ) : (
        <GeenToegang />
      )}
    </main>
  );
}
