"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";

export default function Notes({ phaseId, initial }: { phaseId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [dirty, setDirty] = useState(false);

  useUnsavedWarning(dirty);

  async function save() {
    if (!dirty) return;
    setSaved("saving");
    const supabase = createClient();
    const { error } = await supabase.from("pws_phases").update({ notes: value }).eq("id", phaseId);
    if (error) {
      setSaved("error");
      return;
    }
    setDirty(false);
    setSaved("done");
    setTimeout(() => setSaved("idle"), 2500);
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setDirty(true); }}
        onBlur={save}
        rows={8}
        placeholder="Ruimte voor uitwerking, losse gedachten of aanvullingen. Grotere bestanden voeg je als bijlage toe."
        className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      <div aria-live="polite" className={`mt-1 h-4 text-xs ${saved === "error" ? "text-red-600" : "text-slate-500"}`}>
        {saved === "saving"
          ? "Opslaan…"
          : saved === "done"
            ? "Opgeslagen ✓"
            : saved === "error"
              ? "Opslaan mislukt — controleer je verbinding en klik nog eens buiten het veld."
              : "Wordt automatisch opgeslagen"}
      </div>
    </div>
  );
}
