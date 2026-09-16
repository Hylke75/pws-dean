"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ToetsCriterium } from "@/lib/types";

export default function CriteriaChecklist({ initial }: { initial: ToetsCriterium[] }) {
  const [items, setItems] = useState<ToetsCriterium[]>(initial);
  const supabase = createClient();

  async function toggle(item: ToetsCriterium) {
    const done = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done } : i)));
    await supabase.from("pws_toets_criteria").update({ done }).eq("id", item.id);
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">Voor deze fase zijn geen criteria vastgelegd.</p>;
  }

  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{done}/{items.length} afgevinkt</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => toggle(item)}
              className="flex w-full items-start gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                  item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                }`}
              >
                {item.done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`text-sm ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {item.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
