"use client";

import { useState } from "react";
import { plaatsOpmerking, verwijderOpmerking, zetVerwerkt } from "@/app/verslag/actions";
import type { Opmerking } from "@/lib/types";

const datum = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Opmerkingen bij één hoofdstuk: plaatsen, reageren en afvinken als verwerkt. */
export default function Opmerkingen({
  hoofdstuk,
  titel,
  lijst,
  mijnId,
  isLeerling,
  onWijzig,
}: {
  hoofdstuk: string;
  titel: string;
  lijst: Opmerking[];
  mijnId: string | null;
  isLeerling: boolean;
  onWijzig: (lijst: Opmerking[]) => void;
}) {
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const openstaand = lijst.filter((o) => !o.verwerkt).length;

  async function plaats() {
    setBezig(true);
    setFout(null);
    const r = await plaatsOpmerking(hoofdstuk, titel, tekst);
    setBezig(false);
    if (!r.ok) return setFout(r.error);
    if (r.data) onWijzig([...lijst, r.data]);
    setTekst("");
    setOpen(false);
  }

  async function verwerkt(o: Opmerking, waarde: boolean) {
    onWijzig(lijst.map((x) => (x.id === o.id ? { ...x, verwerkt: waarde } : x)));
    const r = await zetVerwerkt(o.id, waarde);
    if (!r.ok) {
      setFout(r.error);
      onWijzig(lijst);
    }
  }

  async function verwijder(o: Opmerking) {
    if (!confirm("Deze opmerking verwijderen?")) return;
    const r = await verwijderOpmerking(o.id);
    if (r.ok) onWijzig(lijst.filter((x) => x.id !== o.id));
    else setFout(r.error);
  }

  return (
    <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-sky-900">
          💬 Opmerkingen{lijst.length > 0 && ` (${openstaand} open${lijst.length > openstaand ? `, ${lijst.length - openstaand} verwerkt` : ""})`}
        </p>
        {!open && (
          <button onClick={() => setOpen(true)} className="text-xs font-medium text-sky-700 hover:underline">
            {isLeerling ? (lijst.length ? "+ Reageren" : "+ Vraag stellen aan je begeleider") : "+ Opmerking plaatsen"}
          </button>
        )}
      </div>

      {lijst.length > 0 && (
        <ul className="mt-2 space-y-2">
          {lijst.map((o) => (
            <li key={o.id} className={`rounded-lg bg-white p-2.5 text-sm ${o.verwerkt ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  <strong className="text-slate-700">{o.auteur_naam ?? "Onbekend"}</strong> · {datum(o.created_at)}
                </span>
                <span className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1">
                    <input type="checkbox" checked={o.verwerkt} onChange={(e) => verwerkt(o, e.target.checked)} />
                    Verwerkt
                  </label>
                  {o.auteur === mijnId && (
                    <button onClick={() => verwijder(o)} className="text-slate-400 hover:text-rose-600" title="Verwijderen">
                      ✕
                    </button>
                  )}
                </span>
              </div>
              <p className={`mt-1 whitespace-pre-wrap text-slate-800 ${o.verwerkt ? "line-through decoration-slate-300" : ""}`}>{o.tekst}</p>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-2">
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            rows={3}
            autoFocus
            placeholder={isLeerling ? "Je reactie of vraag…" : "Je opmerking bij dit hoofdstuk…"}
            className="w-full resize-y rounded-lg border border-sky-200 bg-white p-2 text-sm outline-none focus:border-sky-500"
          />
          <div className="mt-1 flex gap-2">
            <button
              onClick={plaats}
              disabled={bezig || !tekst.trim()}
              className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
            >
              {bezig ? "Plaatsen…" : "Plaatsen"}
            </button>
            <button onClick={() => { setOpen(false); setTekst(""); }} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              Annuleren
            </button>
          </div>
        </div>
      )}
      {fout && <p className="mt-1 text-xs text-rose-600">{fout}</p>}
    </div>
  );
}
