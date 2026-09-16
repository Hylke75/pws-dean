"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PhaseStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const ORDER: PhaseStatus[] = ["te_doen", "bezig", "klaar"];

export default function StatusSelect({ phaseId, status }: { phaseId: string; status: PhaseStatus }) {
  const [value, setValue] = useState<PhaseStatus>(status);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function set(next: PhaseStatus) {
    setValue(next);
    setSaving(true);
    const supabase = createClient();
    await supabase.from("pws_phases").update({ status: next }).eq("id", phaseId);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      {ORDER.map((s) => (
        <button
          key={s}
          onClick={() => set(s)}
          disabled={saving}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            value === s
              ? s === "klaar"
                ? "bg-emerald-600 text-white"
                : s === "bezig"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-600 text-white"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
