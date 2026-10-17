"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { IvThema, IvVraagBron } from "@/lib/interview";

/** Eén vraag bewerken: tekst (u- en eventueel je-vorm), toelichting en thema's. Slaat op bij verlaten van een veld. */
export default function VraagBewerker({
  vraag,
  themas,
  metJeVorm = false,
  children,
}: {
  vraag: IvVraagBron;
  themas: IvThema[];
  metJeVorm?: boolean;
  children?: React.ReactNode;
}) {
  const supabase = createClient();
  const [v, setV] = useState(vraag);
  const [status, setStatus] = useState("");

  async function bewaar(patch: Partial<IvVraagBron>) {
    const nieuw = { ...v, ...patch };
    setV(nieuw);
    if (patch.tekst !== undefined && !patch.tekst.trim()) return setStatus("Vraagtekst mag niet leeg zijn.");
    const { error } = await supabase.from("pws_iv_vragen").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", v.id);
    setStatus(error ? "Opslaan lukte niet." : "Opgeslagen");
    if (!error) setTimeout(() => setStatus(""), 1500);
  }

  const veld = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <label className="block text-xs font-medium text-slate-500">
        Vraag{metJeVorm ? " (u-vorm)" : ""}
        <textarea defaultValue={v.tekst} rows={2} onBlur={(e) => e.target.value !== v.tekst && bewaar({ tekst: e.target.value.trim() })} className={`${veld} font-medium text-slate-900`} />
      </label>
      {metJeVorm && (
        <label className="mt-2 block text-xs font-medium text-slate-500">
          Je-vorm (voor studenten en starters)
          <textarea defaultValue={v.tekst_je ?? ""} rows={2} onBlur={(e) => e.target.value !== (v.tekst_je ?? "") && bewaar({ tekst_je: e.target.value.trim() || null })} className={veld} />
        </label>
      )}
      <label className="mt-2 block text-xs font-medium text-slate-500">
        Toelichting (optioneel)
        <input defaultValue={v.toelichting ?? ""} onBlur={(e) => e.target.value !== (v.toelichting ?? "") && bewaar({ toelichting: e.target.value.trim() || null })} className={veld} />
      </label>
      <fieldset className="mt-2">
        <legend className="text-xs font-medium text-slate-500">Thema&apos;s</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {themas.map((t) => {
            const aan = v.themas.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={aan}
                onClick={() => bewaar({ themas: aan ? v.themas.filter((x) => x !== t.key) : [...v.themas, t.key] })}
                className={`rounded-full border px-2.5 py-1 text-xs ${aan ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                {t.naam}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {children}
        {status && <span role="status" className="text-xs text-slate-500">{status}</span>}
      </div>
    </div>
  );
}
