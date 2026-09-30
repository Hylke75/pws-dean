"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deelvraagLabel } from "@/lib/subquestions";
import type { Source, Subquestion } from "@/lib/types";

// Buiten de component: uniek opslagpad (Date.now mag niet tijdens render).
function maakBronPad(userId: string, sourceId: string, filename: string): string {
  const veilig = filename.replace(/[^\w.\-]+/g, "_");
  return `${userId}/bronnen/${sourceId}/${Date.now()}-${veilig}`;
}

const CHECKS: { key: string; label: string }[] = [
  { key: "auteur", label: "Auteur of organisatie is bekend en deskundig" },
  { key: "actueel", label: "De bron is actueel genoeg voor mijn onderwerp" },
  { key: "objectief", label: "De bron is objectief (geen reclame of eenzijdige mening)" },
  { key: "controleerbaar", label: "De informatie is elders te controleren" },
];

const SOORTEN: Source["source_type"][] = ["website", "boek", "artikel", "video", "interview", "overig"];

export default function BronUitwerking({
  source,
  deelvragen,
  onUpdate,
}: {
  source: Source;
  deelvragen: Subquestion[];
  onUpdate: (patch: Partial<Source>) => void;
}) {
  const [basis, setBasis] = useState({
    source_type: source.source_type,
    title: source.title,
    authors: source.authors ?? "",
    year: source.year ?? "",
    publisher: source.publisher ?? "",
    url: source.url ?? "",
    accessed_on: source.accessed_on ?? "",
  });
  const [summary, setSummary] = useState(source.summary ?? "");
  const [aiBezig, setAiBezig] = useState(false);
  const [aiMelding, setAiMelding] = useState<string | null>(null);
  const [quotes, setQuotes] = useState(source.quotes ?? "");
  const relevance = source.relevance ?? "";
  const [reliability, setReliability] = useState<Record<string, boolean>>(source.reliability ?? {});
  const [saved, setSaved] = useState<"idle" | "done">("idle");
  const [docBezig, setDocBezig] = useState(false);
  const [docFout, setDocFout] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocBezig(true);
    setDocFout(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const path = maakBronPad(user?.id ?? "anon", source.id, file.name);
    const { error } = await supabase.storage.from("pws-files").upload(path, file);
    if (error) {
      setDocFout("Uploaden mislukt: " + error.message);
      setDocBezig(false);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    // Eventueel oud document opruimen.
    if (source.document_path) {
      await supabase.storage.from("pws-files").remove([source.document_path]);
    }
    await save({ document_path: path, document_name: file.name });
    setDocBezig(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function openDocument() {
    if (!source.document_path) return;
    const { data } = await supabase.storage.from("pws-files").createSignedUrl(source.document_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function verwijderDocument() {
    if (!source.document_path) return;
    await supabase.storage.from("pws-files").remove([source.document_path]);
    await save({ document_path: null, document_name: null });
  }

  async function save(patch: Partial<Source>) {
    await supabase.from("pws_sources").update(patch).eq("id", source.id);
    onUpdate(patch);
    setSaved("done");
    setTimeout(() => setSaved("idle"), 1200);
  }

  function saveBasis() {
    save({
      source_type: basis.source_type,
      title: basis.title.trim() || source.title,
      authors: basis.authors.trim() || null,
      year: basis.year.trim() || null,
      publisher: basis.publisher.trim() || null,
      url: basis.url.trim() || null,
      accessed_on: basis.accessed_on || null,
    });
  }
  const setB = (k: keyof typeof basis) => (v: string) => setBasis((b) => ({ ...b, [k]: v }));

  async function samenvatMetAi() {
    setAiBezig(true);
    setAiMelding(null);
    try {
      const res = await fetch(`/api/bron/${source.id}/samenvatting`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setSummary(json.summary);
        onUpdate({ summary: json.summary });
        if (!json.hadContent) {
          setAiMelding("De pagina kon niet worden opgehaald — samenvatting is op basis van de titel. Controleer en vul zelf aan.");
        }
      } else if (json.reason === "no_key") {
        setAiMelding("AI-samenvatten staat nog niet aan (geen API-sleutel ingesteld).");
      } else {
        setAiMelding("Samenvatten met AI is even niet gelukt. Probeer het zo nog eens.");
      }
    } catch {
      setAiMelding("Samenvatten met AI is even niet gelukt. Controleer je verbinding.");
    } finally {
      setAiBezig(false);
    }
  }

  function toggleCheck(key: string) {
    const next = { ...reliability, [key]: !reliability[key] };
    setReliability(next);
    save({ reliability: next });
  }

  const score = CHECKS.filter((c) => reliability[c.key]).length;

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Basisgegevens</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <select value={basis.source_type} onChange={(e) => { setB("source_type")(e.target.value); }} onBlur={saveBasis} className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500">
            {SOORTEN.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={basis.title} onChange={(e) => setB("title")(e.target.value)} onBlur={saveBasis} placeholder="Titel" className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
          <input value={basis.authors} onChange={(e) => setB("authors")(e.target.value)} onBlur={saveBasis} placeholder="Auteur(s)" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
          <input value={basis.year} onChange={(e) => setB("year")(e.target.value)} onBlur={saveBasis} placeholder="Jaar" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
          <input value={basis.publisher} onChange={(e) => setB("publisher")(e.target.value)} onBlur={saveBasis} placeholder="Uitgever / site" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
          <input type="date" value={basis.accessed_on} onChange={(e) => setB("accessed_on")(e.target.value)} onBlur={saveBasis} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
          <input value={basis.url} onChange={(e) => setB("url")(e.target.value)} onBlur={saveBasis} placeholder="URL" className="col-span-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Samenvatting</label>
          <button
            type="button"
            onClick={samenvatMetAi}
            disabled={aiBezig}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            {aiBezig ? "Bezig met samenvatten…" : "✨ Samenvatten met AI"}
          </button>
        </div>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => save({ summary: summary || null })}
          rows={3}
          placeholder="Wat staat er in deze bron? Laat AI een opzet maken of schrijf het in je eigen woorden."
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
        />
        {aiMelding && <p className="mt-1 text-xs text-amber-600">{aiMelding}</p>}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Belangrijke citaten</label>
        <textarea
          value={quotes}
          onChange={(e) => setQuotes(e.target.value)}
          onBlur={() => save({ quotes: quotes || null })}
          rows={2}
          placeholder="Letterlijke citaten die je misschien wilt gebruiken (met paginanummer)."
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoort bij welke deelvraag?</label>
        {deelvragen.length === 0 ? (
          <p className="mt-1 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
            Nog geen deelvragen. Zet ze eerst bij fase 2 (Onderzoeksvraag).
          </p>
        ) : (
          <select
            value={source.subquestion_id ?? ""}
            onChange={(e) => save({ subquestion_id: e.target.value || null })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">— Geen deelvraag —</option>
            {deelvragen.map((d, i) => (
              <option key={d.id} value={d.id}>{deelvraagLabel(d, i)}</option>
            ))}
          </select>
        )}
        {relevance && (
          <p className="mt-1 text-xs text-slate-400">Eerdere notitie: {relevance}</p>
        )}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Document</label>
        <p className="mt-0.5 text-xs text-slate-500">Upload de bron zelf (pdf, scan, artikel) of een uitwerking erbij.</p>
        {source.document_path ? (
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-slate-500">📎</span>
            <button onClick={openDocument} className="flex-1 truncate text-left text-sm text-slate-700 hover:underline">
              {source.document_name ?? "Document openen"}
            </button>
            <label className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
              {docBezig ? "Bezig…" : "Vervangen"}
              <input ref={fileRef} type="file" onChange={uploadDocument} disabled={docBezig} className="hidden" />
            </label>
            <button
              onClick={verwijderDocument}
              disabled={docBezig}
              className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
              aria-label="Document verwijderen"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600">
            {docBezig ? "Uploaden…" : "📁 Document uploaden"}
            <input ref={fileRef} type="file" onChange={uploadDocument} disabled={docBezig} className="hidden" />
          </label>
        )}
        {docFout && <p className="mt-1 text-xs text-red-600">{docFout}</p>}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Betrouwbaarheid</label>
          <span className={`text-xs font-semibold ${score >= 3 ? "text-emerald-600" : score === 2 ? "text-amber-600" : "text-red-600"}`}>
            {score}/4
          </span>
        </div>
        <ul className="mt-1 space-y-1">
          {CHECKS.map((c) => (
            <li key={c.key}>
              <button onClick={() => toggleCheck(c.key)} className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left hover:bg-slate-50">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-white ${
                    reliability[c.key] ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
                  }`}
                >
                  {reliability[c.key] && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm ${reliability[c.key] ? "text-slate-700" : "text-slate-500"}`}>{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="h-3 text-xs text-emerald-600">{saved === "done" ? "Opgeslagen ✓" : ""}</div>
    </div>
  );
}
