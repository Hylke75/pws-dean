"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VERSLAG_SECTIES } from "@/lib/verslag";
import type { VerslagSectie } from "@/lib/types";

type Status = "te_doen" | "bezig" | "klaar";
const STATUS_LABEL: Record<Status, string> = { te_doen: "Te doen", bezig: "Bezig", klaar: "Klaar" };
const STATUS_STYLE: Record<Status, string> = {
  te_doen: "bg-slate-100 text-slate-600",
  bezig: "bg-amber-100 text-amber-700",
  klaar: "bg-emerald-100 text-emerald-700",
};
const ORDER: Status[] = ["te_doen", "bezig", "klaar"];

export default function VerslagClient({ initial }: { initial: VerslagSectie[] }) {
  const byKey = new Map(initial.map((s) => [s.section_key, s]));
  const [state, setState] = useState<Record<string, { status: Status; notes: string }>>(
    Object.fromEntries(
      VERSLAG_SECTIES.map((s) => {
        const row = byKey.get(s.key);
        return [s.key, { status: (row?.status as Status) ?? "te_doen", notes: row?.notes ?? "" }];
      }),
    ),
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const supabase = createClient();

  async function persist(key: string, patch: { status?: Status; notes?: string }) {
    const cur = state[key];
    const next = { ...cur, ...patch };
    setState((s) => ({ ...s, [key]: next }));
    await supabase
      .from("pws_verslag_secties")
      .upsert({ section_key: key, status: next.status, notes: next.notes || null }, { onConflict: "section_key" });
  }

  const klaar = Object.values(state).filter((s) => s.status === "klaar").length;
  const pct = Math.round((klaar / VERSLAG_SECTIES.length) * 100);

  return (
    <div>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-slate-500">Onderdelen klaar</p>
          <p className="text-sm font-medium text-slate-500">{klaar}/{VERSLAG_SECTIES.length}</p>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {VERSLAG_SECTIES.map((sec, i) => {
          const st = state[sec.key];
          const open = openKey === sec.key;
          return (
            <li key={sec.key} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                  {i + 1}
                </span>
                <button onClick={() => setOpenKey(open ? null : sec.key)} className="flex-1 text-left">
                  <p className="font-medium text-slate-900">{sec.title}</p>
                  <p className="text-xs text-slate-400">{sec.description}</p>
                </button>
                {sec.bron && (
                  <span className="hidden rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 sm:inline">
                    uit {sec.bron}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[st.status]}`}>
                  {STATUS_LABEL[st.status]}
                </span>
              </div>
              {open && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="mb-2 inline-flex rounded-lg border border-slate-200 p-1">
                    {ORDER.map((s) => (
                      <button
                        key={s}
                        onClick={() => persist(sec.key, { status: s })}
                        className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                          st.status === s ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={st.notes}
                    onChange={(e) => setState((x) => ({ ...x, [sec.key]: { ...x[sec.key], notes: e.target.value } }))}
                    onBlur={() => persist(sec.key, {})}
                    rows={3}
                    placeholder="Notities: wat moet er nog in dit hoofdstuk, of plak hier je concepttekst."
                    className="w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
