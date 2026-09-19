"use client";

import { useState } from "react";
import type { FaseHulp as Hulp } from "@/lib/faseVelden";

export default function FaseHulp({ hulp, defaultOpen = false }: { hulp: Hulp; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-emerald-800">💡 Zo pak je deze fase aan</span>
        <span className="text-emerald-600">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4">
          {hulp.aanpak && hulp.aanpak.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Stappen</p>
              <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700">
                {hulp.aanpak.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {hulp.letOp && hulp.letOp.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Let op</p>
              <ul className="space-y-1 text-sm text-slate-700">
                {hulp.letOp.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(hulp.voorbeeldGoed || hulp.voorbeeldFout) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {hulp.voorbeeldGoed && (
                <div className="rounded-lg bg-emerald-100/60 p-2.5 text-sm text-emerald-900">
                  <span className="font-semibold">✓ Goed: </span>{hulp.voorbeeldGoed}
                </div>
              )}
              {hulp.voorbeeldFout && (
                <div className="rounded-lg bg-red-100/60 p-2.5 text-sm text-red-900">
                  <span className="font-semibold">✗ Niet: </span>{hulp.voorbeeldFout}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
