"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

function ago(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "net";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} u`;
  return `${Math.floor(s / 86400)} d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("pws_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as Notification[]) ?? []);
  }

  useEffect(() => {
    // Meldingen ophalen na mount + elke minuut verversen (async fetch, geen render-side state).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  async function markAllRead() {
    const supabase = createClient();
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await supabase.from("pws_notifications").update({ read: true }).in("id", ids);
  }

  async function markOne(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    const supabase = createClient();
    await supabase.from("pws_notifications").update({ read: true }).eq("id", id);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Meldingen"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-semibold text-slate-800">Meldingen</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-emerald-600 hover:underline">
                Alles gelezen
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Nog geen meldingen.</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div className={`flex gap-3 px-4 py-3 hover:bg-slate-50 ${n.read ? "" : "bg-emerald-50/50"}`}>
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: n.read ? "transparent" : "#10b981" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                      <p className="mt-0.5 text-[11px] text-slate-500">{ago(n.created_at)}</p>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => { markOne(n.id); setOpen(false); }}>
                    {inner}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => markOne(n.id)} className="block w-full text-left">
                    {inner}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
