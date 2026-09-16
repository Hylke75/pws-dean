"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Notes({ phaseId, initial }: { phaseId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");

  async function save() {
    if (value === initial && saved === "idle") return;
    setSaved("saving");
    const supabase = createClient();
    await supabase.from("pws_phases").update({ notes: value }).eq("id", phaseId);
    setSaved("done");
    setTimeout(() => setSaved("idle"), 1500);
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={6}
        placeholder="Jouw notities, ideeën en aantekeningen voor deze fase…"
        className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      <div className="mt-1 h-4 text-xs text-slate-400">
        {saved === "saving" ? "Opslaan…" : saved === "done" ? "Opgeslagen ✓" : "Wordt automatisch opgeslagen"}
      </div>
    </div>
  );
}
