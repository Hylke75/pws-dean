"use client";

import { useState } from "react";
import { IV_STATUS_LABEL, type IvStatus, type IvToestemming } from "@/lib/interview";

export type ExportRij = { id: string; naam: string; type_naam: string; status: IvStatus; afgerond_op: string | null; toestemming: IvToestemming | null };

const FORMATEN = [
  { key: "pdf", titel: "PDF-verslag", uitleg: "Verzorgd verslag per respondent, met naam, functie, organisatie, datum, vragen en volledige antwoorden." },
  { key: "docx", titel: "Word-document", uitleg: "Bewerkbaar document met alle interviews, om teksten over te nemen in je profielwerkstuk." },
  { key: "csv", titel: "CSV (Excel)", uitleg: "Eén rij per antwoord met respondent, vraag-ID, vraag, thema's en antwoord." },
  { key: "vergelijk-docx", titel: "Vergelijkend rapport (Word)", uitleg: "Per thema de antwoorden van alle respondenten onder elkaar." },
  { key: "vergelijk-pdf", titel: "Vergelijkend rapport (PDF)", uitleg: "Hetzelfde rapport als PDF." },
];

export default function InterviewExport({ rijen }: { rijen: ExportRij[] }) {
  const [gekozen, setGekozen] = useState<Set<string>>(new Set(rijen.filter((r) => r.status === "afgerond").map((r) => r.id)));
  const [anoniem, setAnoniem] = useState(false);

  if (!rijen.length) {
    return <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Er zijn nog geen ingevulde interviews om te exporteren.</p>;
  }

  const ids = [...gekozen].join(",");
  const href = (f: string) => `/api/interviews/export?formaat=${f}&ids=${ids}${anoniem ? "&anoniem=1" : ""}`;
  const wissel = (id: string) => setGekozen((g) => { const n = new Set(g); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">Welke interviews?</p>
          <div className="flex gap-2 text-sm">
            <button onClick={() => setGekozen(new Set(rijen.map((r) => r.id)))} className="text-emerald-700 hover:underline">Alles</button>
            <button onClick={() => setGekozen(new Set(rijen.filter((r) => r.status === "afgerond").map((r) => r.id)))} className="text-emerald-700 hover:underline">Alleen afgerond</button>
          </div>
        </div>
        <ul className="mt-2 divide-y divide-slate-100">
          {rijen.map((r) => (
            <li key={r.id}>
              <label className="flex items-center gap-3 py-2 text-sm">
                <input type="checkbox" checked={gekozen.has(r.id)} onChange={() => wissel(r.id)} className="h-4 w-4 accent-emerald-600" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">{r.naam}</span>
                  <span className="text-slate-500"> · {r.type_naam} · {IV_STATUS_LABEL[r.status]}</span>
                  {r.toestemming && !r.toestemming.naam_vermelden && <span className="ml-1 rounded bg-amber-50 px-1.5 text-xs text-amber-700">anoniem</span>}
                  {r.toestemming && !r.toestemming.citeren && <span className="ml-1 rounded bg-amber-50 px-1.5 text-xs text-amber-700">niet citeren</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <input type="checkbox" checked={anoniem} onChange={(e) => setAnoniem(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
        <span>
          <span className="font-medium text-slate-900">Geanonimiseerde export</span>
          <span className="block text-slate-600">
            Namen, functies en organisaties worden vervangen door ‘Respondent 1 (type)’. Zonder dit vinkje worden namen alleen getoond van
            respondenten die daar toestemming voor gaven. E-mailadressen staan nooit in een export.
          </span>
        </span>
      </label>

      <section className="grid gap-2 sm:grid-cols-2">
        {FORMATEN.map((f) => (
          <a
            key={f.key}
            href={gekozen.size ? href(f.key) : undefined}
            aria-disabled={!gekozen.size}
            className={`block rounded-2xl border bg-white p-4 transition ${gekozen.size ? "border-slate-200 hover:border-emerald-300 hover:shadow-sm" : "pointer-events-none border-slate-100 opacity-50"}`}
          >
            <p className="font-semibold text-slate-900">⬇ {f.titel}</p>
            <p className="mt-1 text-sm text-slate-500">{f.uitleg}</p>
          </a>
        ))}
      </section>
      <p className="text-xs text-slate-500">Respondenten die niet letterlijk geciteerd willen worden, zijn in elke export gemarkeerd. Gebruik hun antwoorden alleen in eigen woorden.</p>
    </div>
  );
}
