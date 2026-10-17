"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BevestigKnop from "@/components/BevestigKnop";

type Inst = { bewaartermijn_maanden: number; contact_email: string; ai_analyse_aan: boolean };

export default function InterviewInstellingen({ begin, aiKoppeling, verlopen }: { begin: Inst; aiKoppeling: boolean; verlopen: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [v, setV] = useState(begin);
  const [melding, setMelding] = useState("");

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setMelding("");
    const maanden = Math.round(Number(v.bewaartermijn_maanden));
    if (!(maanden >= 1 && maanden <= 120)) return setMelding("Kies een bewaartermijn tussen 1 en 120 maanden.");
    if (v.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contact_email.trim())) return setMelding("Dit e-mailadres klopt niet.");
    const { error } = await supabase
      .from("pws_iv_instellingen")
      .update({ bewaartermijn_maanden: maanden, contact_email: v.contact_email.trim() || null, ai_analyse_aan: v.ai_analyse_aan && aiKoppeling })
      .eq("id", 1);
    setMelding(error ? "Opslaan lukte niet." : "Opgeslagen.");
    router.refresh();
  }

  const veld = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500";
  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={opslaan} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block text-sm text-slate-600">
          Bewaartermijn na afronding (maanden)
          <input type="number" min={1} max={120} value={v.bewaartermijn_maanden} onChange={(e) => setV({ ...v, bewaartermijn_maanden: Number(e.target.value) })} className={`${veld} max-w-32`} />
          <span className="mt-1 block text-xs text-slate-500">Na deze termijn worden afgeronde interviews met alle persoonsgegevens automatisch verwijderd (dagelijkse controle). Respondenten zien deze termijn in de privacytekst.</span>
        </label>
        <label className="block text-sm text-slate-600">
          Contactadres voor correctie- of verwijderverzoeken
          <input type="email" value={v.contact_email} onChange={(e) => setV({ ...v, contact_email: e.target.value })} placeholder="bijvoorbeeld het e-mailadres van Dean of de begeleider" className={veld} />
          <span className="mt-1 block text-xs text-slate-500">Wordt getoond in de privacytekst bij elk interview.</span>
        </label>
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={v.ai_analyse_aan && aiKoppeling} disabled={!aiKoppeling} onChange={(e) => setV({ ...v, ai_analyse_aan: e.target.checked })} className="mt-1 accent-emerald-600" />
            <span>
              <span className="font-medium text-slate-800">AI-analyse inschakelen</span>
              <span className="block text-slate-600">
                Respondenten krijgen dan een aparte vraag of hun antwoorden met een AI-hulpmiddel (Claude van Anthropic) mogen worden samengevat.
                Alleen antwoorden van wie ‘ja’ kiest, worden verwerkt, zonder naam en organisatie. Zet dit pas aan als je begeleider akkoord is.
              </span>
              {!aiKoppeling && <span className="mt-1 block text-amber-700">Er is geen AI-koppeling ingesteld op de server; de rest van de module werkt gewoon.</span>}
            </span>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Opslaan</button>
          {melding && <span role="status" className="text-sm text-slate-600">{melding}</span>}
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="font-semibold text-slate-900">Verlopen interviews opruimen</p>
        <p className="mt-1 text-slate-600">
          {verlopen === 0 ? "Er zijn geen interviews waarvan de bewaartermijn is verstreken." : `${verlopen} interview(s) hebben de bewaartermijn overschreden.`}
          {" "}Dit gebeurt ook elke dag automatisch.
        </p>
        {verlopen > 0 && (
          <div className="mt-2">
            <BevestigKnop
              vraag={`${verlopen} verlopen interview(s) definitief verwijderen?`}
              onBevestig={async () => {
                const { data } = await supabase.rpc("pws_iv_opruimen");
                setMelding(`${data ?? 0} interview(s) verwijderd.`);
                router.refresh();
              }}
              className="rounded-lg border border-red-200 px-3 py-1.5 font-medium text-red-600 hover:bg-red-50"
            >
              Nu opruimen
            </BevestigKnop>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Hoe de privacy is geregeld</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Elke respondent krijgt een eigen, onvoorspelbare link en ziet alleen het eigen interview.</li>
          <li>Van de link wordt alleen een versleutelde vingerafdruk (hash) bewaard; een nieuwe link maken schakelt de oude uit.</li>
          <li>Respondenten kiezen apart of hun naam en organisatie genoemd mogen worden en of ze letterlijk geciteerd mogen worden. Exports houden zich daaraan.</li>
          <li>Interviewpagina&apos;s worden niet door zoekmachines opgenomen.</li>
          <li>Alleen ingelogde beheerders van de PWS-tracker kunnen antwoorden lezen.</li>
        </ul>
      </section>
    </div>
  );
}
