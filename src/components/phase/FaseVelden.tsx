"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Veld } from "@/lib/faseVelden";

export default function FaseVelden({
  phaseId,
  velden,
  initial,
}: {
  phaseId: string;
  velden: Veld[];
  initial: Record<string, string>;
}) {
  const [data, setData] = useState<Record<string, string>>(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");
  const supabase = createClient();

  function change(key: string, value: string) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaved("saving");
    await supabase.from("pws_phases").update({ veld_data: data }).eq("id", phaseId);
    setSaved("done");
    setTimeout(() => setSaved("idle"), 1500);
  }

  return (
    <div className="space-y-4">
      {velden.map((v) => (
        <div key={v.key}>
          <label className="block text-sm font-medium text-slate-700">{v.label}</label>
          {v.hint && <p className="mb-1 text-xs text-slate-400">{v.hint}</p>}
          {v.type === "kort" ? (
            <input
              value={data[v.key] ?? ""}
              onChange={(e) => change(v.key, e.target.value)}
              onBlur={save}
              placeholder={v.placeholder}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          ) : (
            <textarea
              value={data[v.key] ?? ""}
              onChange={(e) => change(v.key, e.target.value)}
              onBlur={save}
              rows={v.type === "lijst" ? 4 : 5}
              placeholder={v.placeholder}
              className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          )}
          {v.voorbeeld && (
            <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Voorbeeld:</span> {v.voorbeeld}
            </p>
          )}
        </div>
      ))}
      <div className="h-4 text-xs text-slate-400">
        {saved === "saving" ? "Opslaan…" : saved === "done" ? "Opgeslagen ✓" : "Wordt automatisch opgeslagen"}
      </div>
    </div>
  );
}
