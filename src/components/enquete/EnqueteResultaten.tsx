"use client";

import { useState } from "react";
import {
  alleOpties,
  filterReacties,
  naarLangeCsv,
  waardeVan,
  andersTeksten,
  labelsVoor,
  naarCsv,
  openAntwoorden,
  schaalVerdeling,
  telKeuzes,
  vraagNummers,
  type Reactie,
  type Vraag,
} from "@/lib/enquete";
import { SchaalLegenda, Staven, VerdelingRij } from "./Grafieken";

export default function EnqueteResultaten({
  surveyId,
  titel,
  vragen,
  reacties: alleReacties,
}: {
  surveyId: string;
  titel: string;
  vragen: Vraag[];
  reacties: Reactie[];
}) {
  // Filter op doelgroep: alleen invullers met een bepaald antwoord op een keuzevraag.
  const filterVragen = vragen.filter((v) => v.type === "meerkeuze");
  const [filterQ, setFilterQ] = useState("");
  const [filterW, setFilterW] = useState("");
  const filterVraag = filterVragen.find((v) => v.id === filterQ);
  const reacties = filterVraag && filterW ? filterReacties(alleReacties, filterVraag.id, filterW) : alleReacties;
  const totaal = reacties.length;
  const nummers = vraagNummers(vragen);
  const laatste = totaal ? new Date(reacties[totaal - 1].created_at) : null;
  const vandaag = reacties.filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length;

  function download(inhoud: string, naam: string) {
    const blob = new Blob(["﻿" + inhoud], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquete-${titel.replace(/[^\w]+/g, "_")}${naam}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Tegel label="Reacties" waarde={String(totaal)} />
        <Tegel label="Vandaag" waarde={String(vandaag)} />
        <Tegel
          label="Laatste"
          waarde={laatste ? laatste.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "–"}
        />
      </div>

      {filterVragen.length > 0 && alleReacties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <label htmlFor="filter-vraag" className="text-slate-600">Doelgroep:</label>
          <select
            id="filter-vraag"
            value={filterQ}
            onChange={(e) => { setFilterQ(e.target.value); setFilterW(""); }}
            className="min-w-0 max-w-full flex-1 rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-emerald-500"
          >
            <option value="">Alle invullers</option>
            {filterVragen.map((v) => (
              <option key={v.id} value={v.id}>{nummers[vragen.indexOf(v)]}. {v.text}</option>
            ))}
          </select>
          {filterVraag && (
            <select
              aria-label="Antwoord"
              value={filterW}
              onChange={(e) => setFilterW(e.target.value)}
              className="min-w-0 max-w-full rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-emerald-500"
            >
              <option value="">Kies een antwoord…</option>
              {alleOpties(filterVraag).map((o) => (
                <option key={o} value={waardeVan(filterVraag, o)}>{o}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {totaal > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => download(naarCsv(vragen, reacties, surveyId), "")} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Download CSV (één rij per invuller)
          </button>
          <button onClick={() => download(naarLangeCsv(vragen, reacties, surveyId), "-lang")} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Download CSV (één rij per antwoord)
          </button>
        </div>
      )}

      {totaal === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Nog geen reacties. Deel de link via het tabblad &quot;Delen&quot;.
        </p>
      )}

      {totaal > 0 &&
        vragen.map((v, i) => (
          <section key={v.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            {v.section && (i === 0 || vragen[i - 1].section !== v.section) && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">{v.section}</p>
            )}
            <h3 className="text-sm font-semibold text-slate-900">
              {nummers[i]}. {v.text || "(geen vraagtekst)"}
            </h3>
            <div className="mt-3">
              <VraagResultaat vraag={v} reacties={reacties} />
            </div>
          </section>
        ))}
    </div>
  );
}

function Tegel({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{waarde}</p>
    </div>
  );
}

function VraagResultaat({ vraag, reacties }: { vraag: Vraag; reacties: Reactie[] }) {
  if (vraag.type === "open") {
    const lijst = openAntwoorden(vraag, reacties);
    if (!lijst.length) return <p className="text-sm text-slate-500">Nog geen antwoorden.</p>;
    return (
      <>
        <p className="mb-2 text-xs text-slate-500">{lijst.length} antwoorden</p>
        <ul className="max-h-96 space-y-1.5 overflow-y-auto">
          {lijst.map((t, i) => (
            <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">“{t}”</li>
          ))}
        </ul>
      </>
    );
  }

  if (vraag.type === "schaal") {
    const labels = labelsVoor(vraag);
    const d = schaalVerdeling(vraag, reacties);
    return (
      <div className="space-y-3">
        <VerdelingRij label={`n = ${d.n}`} verdeling={d} labels={labels} weetNietLabel={vraag.config.weetNietLabel} />
        <SchaalLegenda labels={labels} />
      </div>
    );
  }

  if (vraag.type === "stellingen") {
    const labels = labelsVoor(vraag);
    return (
      <div className="space-y-4">
        {(vraag.config.items ?? []).map((s, i) => (
          <VerdelingRij key={i} label={`${i + 1}. ${s}`} verdeling={schaalVerdeling(vraag, reacties, i)} labels={labels} />
        ))}
        <SchaalLegenda labels={labels} />
      </div>
    );
  }

  const { tellingen, beantwoord } = telKeuzes(vraag, reacties);
  const eigen = andersTeksten(vraag, reacties);
  return (
    <>
      <p className="mb-2 text-xs text-slate-500">
        {beantwoord} invullers
        {vraag.type === "meerdere" && " · meerdere antwoorden mogelijk, percentage van invullers"}
      </p>
      <Staven tellingen={tellingen} totaal={beantwoord} sorteer={vraag.type === "meerdere"} />
      {eigen.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-slate-500">Bij &quot;Anders&quot; ingevuld:</p>
          <p className="mt-1 text-sm text-slate-700">{eigen.join(" · ")}</p>
        </div>
      )}
    </>
  );
}
