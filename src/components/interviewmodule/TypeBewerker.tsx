"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BevestigKnop from "@/components/BevestigKnop";
import { geschatteMinuten, type IvThema, type IvType, type IvVraagBron } from "@/lib/interview";
import VraagBewerker from "./VraagBewerker";

export type SetItem = { vraag_id: string; order_index: number; verplicht: boolean; vraag: IvVraagBron };

export default function TypeBewerker({
  type,
  set: begin,
  algemeen,
  themas,
}: {
  type: IvType;
  set: SetItem[];
  algemeen: IvVraagBron[];
  themas: IvThema[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [t, setT] = useState(type);
  const [set, setSet] = useState(begin);
  const [status, setStatus] = useState("");
  const ontbrekend = algemeen.filter((v) => !set.some((s) => s.vraag_id === v.id));

  async function bewaarType(patch: Partial<IvType>) {
    setT((x) => ({ ...x, ...patch }));
    const { error } = await supabase.from("pws_iv_types").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", t.id);
    setStatus(error ? "Opslaan lukte niet." : "Opgeslagen");
    if (!error) setTimeout(() => setStatus(""), 1500);
  }

  async function verplaats(i: number, richting: -1 | 1) {
    const j = i + richting;
    if (j < 0 || j >= set.length) return;
    const nieuw = [...set];
    [nieuw[i], nieuw[j]] = [nieuw[j], nieuw[i]];
    const genummerd = nieuw.map((s, k) => ({ ...s, order_index: k }));
    setSet(genummerd);
    await Promise.all(
      [genummerd[i], genummerd[j]].map((s) =>
        supabase.from("pws_iv_set").update({ order_index: s.order_index }).eq("type_id", t.id).eq("vraag_id", s.vraag_id),
      ),
    );
  }

  async function zetVerplicht(s: SetItem, verplicht: boolean) {
    setSet((x) => x.map((y) => (y.vraag_id === s.vraag_id ? { ...y, verplicht } : y)));
    await supabase.from("pws_iv_set").update({ verplicht }).eq("type_id", t.id).eq("vraag_id", s.vraag_id);
  }

  async function haalWeg(s: SetItem) {
    setSet((x) => x.filter((y) => y.vraag_id !== s.vraag_id));
    await supabase.from("pws_iv_set").delete().eq("type_id", t.id).eq("vraag_id", s.vraag_id);
  }

  async function voegAlgemeneToe(id: string) {
    const v = algemeen.find((x) => x.id === id);
    if (!v) return;
    const order_index = set.length;
    const { error } = await supabase.from("pws_iv_set").insert({ type_id: t.id, vraag_id: id, order_index });
    if (!error) setSet((x) => [...x, { vraag_id: id, order_index, verplicht: false, vraag: v }]);
  }

  async function nieuweVraag() {
    const key = `${t.slug.slice(0, 20)}_${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await supabase
      .from("pws_iv_vragen")
      .insert({ key, algemeen: false, tekst: t.aanspreekvorm === "je" ? "Nieuwe vraag aan jou" : "Nieuwe vraag aan u", themas: [] })
      .select("*")
      .single();
    if (error || !data) return setStatus("Toevoegen lukte niet.");
    const order_index = set.length;
    await supabase.from("pws_iv_set").insert({ type_id: t.id, vraag_id: data.id, order_index });
    setSet((x) => [...x, { vraag_id: data.id, order_index, verplicht: false, vraag: data as IvVraagBron }]);
  }

  const veld = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500";
  const knop = "rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30";

  return (
    <div className="mt-6 space-y-5">
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900">{t.naam}</h1>
          <div className="flex items-center gap-2">
            {status && <span role="status" className="text-xs text-slate-500">{status}</span>}
            <a href={`/interviews/voorbeeld/${t.id}`} target="_blank" rel="noopener" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Vooraf bekijken ↗
            </a>
          </div>
        </div>
        <label className="block text-sm text-slate-600">
          Naam
          <input defaultValue={t.naam} onBlur={(e) => e.target.value.trim() && e.target.value !== t.naam && bewaarType({ naam: e.target.value.trim() })} className={veld} />
        </label>
        <label className="block text-sm text-slate-600">
          Omschrijving (alleen voor jezelf)
          <input defaultValue={t.beschrijving ?? ""} onBlur={(e) => e.target.value !== (t.beschrijving ?? "") && bewaarType({ beschrijving: e.target.value.trim() || null })} className={veld} />
        </label>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <fieldset className="flex items-center gap-3">
            <legend className="sr-only">Aanspreekvorm</legend>
            Aanspreekvorm:
            {(["u", "je"] as const).map((v) => (
              <label key={v} className="flex items-center gap-1">
                <input type="radio" name="vorm" checked={t.aanspreekvorm === v} onChange={() => bewaarType({ aanspreekvorm: v })} className="accent-emerald-600" />
                {v}-vorm
              </label>
            ))}
          </fieldset>
          <fieldset className="flex items-center gap-3">
            <legend className="sr-only">Status</legend>
            Status:
            {(["concept", "gepubliceerd"] as const).map((v) => (
              <label key={v} className="flex items-center gap-1">
                <input type="radio" name="status" checked={t.status === v} onChange={() => bewaarType({ status: v })} className="accent-emerald-600" />
                {v === "concept" ? "Concept" : "Gepubliceerd (beschikbaar bij uitnodigen)"}
              </label>
            ))}
          </fieldset>
        </div>
        <label className="block text-sm text-slate-600">
          Introductietekst
          <textarea defaultValue={t.intro ?? ""} rows={8} onBlur={(e) => e.target.value !== (t.intro ?? "") && bewaarType({ intro: e.target.value.trim() || null })} className={veld} />
        </label>
        <label className="block text-sm text-slate-600">
          Naam in het Engels
          <input defaultValue={t.naam_en ?? ""} lang="en" onBlur={(e) => e.target.value !== (t.naam_en ?? "") && bewaarType({ naam_en: e.target.value.trim() || null })} className={veld} />
        </label>
        <label className="block text-sm text-slate-600">
          Introductietekst in het Engels
          <textarea defaultValue={t.intro_en ?? ""} rows={8} lang="en" onBlur={(e) => e.target.value !== (t.intro_en ?? "") && bewaarType({ intro_en: e.target.value.trim() || null })} className={veld} />
          <span className="mt-1 block text-xs text-slate-500">Respondenten kunnen met de knop ‘English’ het interview in het Engels invullen. De vragen vertaal je bij Vragen en typen.</span>
        </label>
        <p className="text-xs text-slate-500">
          {set.length} vragen · geschatte invultijd {geschatteMinuten(set.length)} minuten. Wijzigingen gelden voor nieuwe uitnodigingen;
          verstuurde interviews houden hun eigen vaste versie.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Vragen in dit interview</h2>
        {set.map((s, i) => (
          <div key={s.vraag_id} className="flex gap-2">
            <div className="flex flex-col items-center pt-3">
              <span className="text-sm font-semibold text-slate-500">{i + 1}.</span>
              <button className={knop} onClick={() => verplaats(i, -1)} disabled={i === 0} aria-label="Omhoog">▲</button>
              <button className={knop} onClick={() => verplaats(i, 1)} disabled={i === set.length - 1} aria-label="Omlaag">▼</button>
            </div>
            <div className="min-w-0 flex-1">
              {s.vraag.algemeen ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Algemene vraag</p>
                  <p className="mt-1 font-medium text-slate-900">{t.aanspreekvorm === "je" && s.vraag.tekst_je ? s.vraag.tekst_je : s.vraag.tekst}</p>
                  <p className="mt-1 text-xs text-slate-500">Bewerk algemene vragen onder ‘Vragen en typen’; dat geldt voor alle interviewtypen.</p>
                  <SetKnoppen s={s} onVerplicht={zetVerplicht} onWeg={haalWeg} />
                </div>
              ) : (
                <VraagBewerker vraag={s.vraag} themas={themas}>
                  <SetKnoppen s={s} onVerplicht={zetVerplicht} onWeg={haalWeg} />
                </VraagBewerker>
              )}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
          <button onClick={nieuweVraag} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700">
            + Eigen vraag voor deze doelgroep
          </button>
          {ontbrekend.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && voegAlgemeneToe(e.target.value)}
              aria-label="Algemene vraag toevoegen"
              className="min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600"
            >
              <option value="">+ Algemene vraag toevoegen…</option>
              {ontbrekend.map((v) => (
                <option key={v.id} value={v.id}>{v.tekst}</option>
              ))}
            </select>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <button
          onClick={async () => {
            await bewaarType({ gearchiveerd: !t.gearchiveerd });
            router.refresh();
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t.gearchiveerd ? "Uit archief halen" : "Interviewtype archiveren"}
        </button>
        <p className="mt-1 text-xs text-slate-500">Een gearchiveerd type kun je niet meer kiezen bij nieuwe uitnodigingen. Bestaande interviews blijven gewoon werken.</p>
      </section>
    </div>
  );
}

function SetKnoppen({
  s,
  onVerplicht,
  onWeg,
}: {
  s: SetItem;
  onVerplicht: (s: SetItem, v: boolean) => void;
  onWeg: (s: SetItem) => Promise<void>;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-1.5 text-slate-600">
        <input type="checkbox" checked={s.verplicht} onChange={(e) => onVerplicht(s, e.target.checked)} className="accent-emerald-600" />
        Verplicht
      </label>
      <BevestigKnop vraag="Uit dit interview halen?" bevestig="Ja" onBevestig={() => onWeg(s)} className="text-slate-400 hover:text-red-600">
        Uit dit interview halen
      </BevestigKnop>
    </div>
  );
}
