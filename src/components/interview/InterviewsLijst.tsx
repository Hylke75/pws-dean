"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtDate } from "@/lib/dates";
import type { Interview } from "@/lib/types";

export default function InterviewsLijst({ initial }: { initial: Interview[] }) {
  const [items] = useState<Interview[]>(initial);
  const [naam, setNaam] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const n = naam.trim();
    if (!n) return;
    setBusy(true);
    const { data } = await supabase.from("pws_interviews").insert({ respondent: n }).select().single();
    setBusy(false);
    if (data) router.push(`/interviews/${data.id}`);
  }

  return (
    <div>
      <form onSubmit={create} className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Wie heb je geïnterviewd?"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button type="submit" disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {busy ? "Aanmaken…" : "Nieuw interview"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          Nog geen interviews. Maak je eerste hierboven aan →
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link href={`/interviews/${it.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300 hover:shadow-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{it.respondent || "Naamloos interview"}</p>
                  {(it.rol || it.datum) && (
                    <p className="text-xs text-slate-500">{[it.rol, it.datum ? fmtDate(it.datum) : null].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
