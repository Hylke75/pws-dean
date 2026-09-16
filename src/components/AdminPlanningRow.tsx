"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlanning } from "@/app/admin/actions";
import type { Phase } from "@/lib/types";

export default function AdminPlanningRow({ phase }: { phase: Phase }) {
  const [title, setTitle] = useState(phase.title);
  const [start, setStart] = useState(phase.start_date ?? "");
  const [deadline, setDeadline] = useState(phase.deadline ?? "");
  const [state, setState] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const dirty = title !== phase.title || start !== (phase.start_date ?? "") || deadline !== (phase.deadline ?? "");

  async function save() {
    setState("saving");
    const fd = new FormData();
    fd.set("phase_id", phase.id);
    fd.set("title", title);
    fd.set("start_date", start);
    fd.set("deadline", deadline);
    const res = await updatePlanning(fd);
    if (res.ok) {
      setState("ok");
      setMsg(res.changed ? `Opgeslagen · ${res.mailed ?? 0} mail(s) verstuurd` : "Geen wijziging");
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } else {
      setState("err");
      setMsg(res.error ?? "Fout");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
          {phase.is_milestone ? "★" : phase.order_index}
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3 pl-9">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Start</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
        </div>
        <button
          onClick={save}
          disabled={!dirty || state === "saving"}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {state === "saving" ? "Opslaan…" : "Opslaan"}
        </button>
        {state === "ok" && <span className="text-xs font-medium text-emerald-600">{msg}</span>}
        {state === "err" && <span className="text-xs font-medium text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
