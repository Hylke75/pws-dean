"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChecklistItem } from "@/lib/types";

export default function Checklist({ phaseId, initial }: { phaseId: string; initial: ChecklistItem[] }) {
  const [items, setItems] = useState<ChecklistItem[]>(initial);
  const [text, setText] = useState("");
  const supabase = createClient();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    const order = items.length;
    const { data } = await supabase
      .from("pws_checklist_items")
      .insert({ phase_id: phaseId, text: t, order_index: order })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as ChecklistItem]);
  }

  async function toggle(item: ChecklistItem) {
    const done = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done } : i)));
    await supabase.from("pws_checklist_items").update({ done }).eq("id", item.id);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("pws_checklist_items").delete().eq("id", id);
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div>
      {items.length > 0 && (
        <p className="mb-2 text-xs text-slate-400">{doneCount}/{items.length} afgevinkt</p>
      )}
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-slate-50">
            <button
              onClick={() => toggle(item)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
              }`}
            >
              {item.done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
              {item.text}
            </span>
            <button
              onClick={() => remove(item.id)}
              className="opacity-0 transition group-hover:opacity-100 text-slate-300 hover:text-red-500"
              aria-label="Verwijderen"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nieuwe taak…"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
        />
        <button type="submit" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
          +
        </button>
      </form>
    </div>
  );
}
