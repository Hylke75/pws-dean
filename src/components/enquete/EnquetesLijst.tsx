"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Survey } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  concept: "bg-slate-100 text-slate-600",
  open: "bg-emerald-100 text-emerald-700",
  gesloten: "bg-amber-100 text-amber-700",
};
const STATUS_LABEL: Record<string, string> = { concept: "Concept", open: "Open", gesloten: "Gesloten" };

export default function EnquetesLijst({ initial, counts }: { initial: Survey[]; counts: Record<string, number> }) {
  const [items] = useState<Survey[]>(initial);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    const { data } = await supabase.from("pws_surveys").insert({ title: t }).select().single();
    setBusy(false);
    if (data) router.push(`/enquetes/${data.id}`);
  }

  return (
    <div>
      <form onSubmit={create} className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel van je nieuwe enquête…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button type="submit" disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {busy ? "Aanmaken…" : "Nieuwe enquête"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          Nog geen enquêtes. Maak je eerste hierboven aan →
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/enquetes/${s.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{s.title}</p>
                  <p className="text-xs text-slate-500">{counts[s.id] ?? 0} reactie{(counts[s.id] ?? 0) === 1 ? "" : "s"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
