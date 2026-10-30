"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deelvraagLabel } from "@/lib/subquestions";
import type { AnalyseDocument, Subquestion } from "@/lib/types";

const TOEGESTAAN = [".pdf", ".docx", ".csv", ".txt"];
const MAX_MB = 10;

function vandaag() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

// Buiten de component: uniek pad voor een upload (Date.now mag niet tijdens render).
function uploadPad(naam: string) {
  return `analyses/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${naam.replace(/[^\w.-]+/g, "_")}`;
}

/** Documenten met analyses (eigen of van anderen) toevoegen; de AI vat ze samen voor de onderzoeksanalyse. */
export default function AnalyseDocumenten({ initial, deelvragen }: { initial: AnalyseDocument[]; deelvragen: Subquestion[] }) {
  const supabase = createClient();
  const [docs, setDocs] = useState(initial);
  const [open, setOpen] = useState(false);
  const [bestand, setBestand] = useState<File | null>(null);
  const [titel, setTitel] = useState("");
  const [soort, setSoort] = useState<"eigen" | "extern">("extern");
  const [auteur, setAuteur] = useState("");
  const [jaar, setJaar] = useState("");
  const [deelvraag, setDeelvraag] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [uitgeklapt, setUitgeklapt] = useState<string | null>(null);

  async function vat(id: string) {
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, status: "bezig" } : x)));
    try {
      const res = await fetch(`/api/analyse-documenten/${id}/samenvatting`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; samenvatting?: string; reason?: string };
      setDocs((d) =>
        d.map((x) =>
          x.id === id
            ? data.ok
              ? { ...x, status: "klaar", samenvatting: data.samenvatting ?? "" }
              : { ...x, status: "fout", samenvatting: data.reason === "no_key" ? "De AI staat nu niet aan." : x.samenvatting ?? "Er ging iets mis." }
            : x,
        ),
      );
    } catch {
      setDocs((d) => d.map((x) => (x.id === id ? { ...x, status: "fout", samenvatting: "Er ging iets mis. Probeer het opnieuw." } : x)));
    }
  }

  async function voegToe(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    if (!bestand) return setFout("Kies eerst een bestand.");
    const naam = bestand.name.toLowerCase();
    if (!TOEGESTAAN.some((x) => naam.endsWith(x))) return setFout("Alleen PDF, Word (.docx), CSV of tekstbestanden. Een Excel-bestand kun je opslaan als CSV of PDF.");
    if (bestand.size > MAX_MB * 1024 * 1024) return setFout(`Het bestand is groter dan ${MAX_MB} MB.`);
    if (!titel.trim()) return setFout("Geef het document een titel.");
    setBezig(true);
    const pad = uploadPad(bestand.name);
    const { error: upErr } = await supabase.storage.from("pws-files").upload(pad, bestand);
    if (upErr) {
      setBezig(false);
      return setFout("Uploaden lukte niet. Probeer het opnieuw.");
    }
    // Een analyse door anderen komt ook in de bronnenlijst (en zo in het verslag, in APA-stijl).
    let bronId: string | null = null;
    if (soort === "extern") {
      const { data: bron } = await supabase
        .from("pws_sources")
        .insert({
          source_type: "overig",
          title: titel.trim(),
          authors: auteur.trim() || null,
          year: jaar.trim() || null,
          publisher: auteur.trim() || null,
          subquestion_id: deelvraag || null,
          document_path: pad,
          document_name: bestand.name,
          accessed_on: vandaag(),
        })
        .select("id")
        .single();
      bronId = bron?.id ?? null;
    }
    const { data, error } = await supabase
      .from("pws_analyse_documenten")
      .insert({
        bron_id: bronId,
        titel: titel.trim(),
        soort,
        auteur: soort === "extern" ? auteur.trim() || null : null,
        jaar: soort === "extern" ? jaar.trim() || null : null,
        deelvraag_id: deelvraag || null,
        bestand_pad: pad,
        bestand_naam: bestand.name,
      })
      .select()
      .single();
    setBezig(false);
    if (error || !data) return setFout("Opslaan lukte niet. Probeer het opnieuw.");
    setDocs((d) => [data as AnalyseDocument, ...d]);
    setBestand(null);
    setTitel("");
    setAuteur("");
    setJaar("");
    setDeelvraag("");
    setOpen(false);
    vat((data as AnalyseDocument).id);
  }

  async function bekijk(d: AnalyseDocument) {
    const { data } = await supabase.storage.from("pws-files").createSignedUrl(d.bestand_pad, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function verwijder(d: AnalyseDocument) {
    const ook = d.bron_id ? " Ook de bijbehorende bron verdwijnt uit je bronnenlijst." : "";
    if (!confirm(`"${d.titel}" verwijderen? Het telt dan niet meer mee in de analyse.${ook}`)) return;
    const { error } = await supabase.from("pws_analyse_documenten").delete().eq("id", d.id);
    if (error) return setFout("Verwijderen lukte niet.");
    if (d.bron_id) await supabase.from("pws_sources").delete().eq("id", d.bron_id);
    await supabase.storage.from("pws-files").remove([d.bestand_pad]);
    setDocs((x) => x.filter((y) => y.id !== d.id));
  }

  const veld = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500";
  const dvNaam = (id: string | null) => {
    const i = deelvragen.findIndex((d) => d.id === id);
    return i >= 0 ? deelvraagLabel(deelvragen[i], i, 40) : null;
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">📄 Analyses toevoegen</p>
          <p className="text-sm text-slate-500">
            Documenten met een analyse, van jezelf of van anderen. Ze tellen mee bij de antwoorden op je onderzoeksvragen;
            een analyse door anderen komt ook vanzelf in je bronnenlijst.
          </p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            + Document toevoegen
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={voegToe} className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
          <input type="file" accept={TOEGESTAAN.join(",")} onChange={(e) => setBestand(e.target.files?.[0] ?? null)} className="block text-sm" />
          <input value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Titel, bijv. 'Analyse enquête werknemers in Excel'" className={veld} />
          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={soort === "eigen"} onChange={() => setSoort("eigen")} /> Eigen analyse
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={soort === "extern"} onChange={() => setSoort("extern")} /> Analyse door anderen (bron)
            </label>
          </div>
          {soort === "extern" && (
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <input value={auteur} onChange={(e) => setAuteur(e.target.value)} placeholder="Auteur of organisatie, bijv. CBS" className={veld} />
              <input value={jaar} onChange={(e) => setJaar(e.target.value)} placeholder="Jaar" className={veld} />
            </div>
          )}
          <select value={deelvraag} onChange={(e) => setDeelvraag(e.target.value)} className={veld}>
            <option value="">Bij welke deelvraag hoort het? (mag leeg)</option>
            {deelvragen.map((d, i) => (
              <option key={d.id} value={d.id}>
                {deelvraagLabel(d, i)}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">PDF, Word (.docx), CSV of tekst, maximaal {MAX_MB} MB. De AI maakt er daarna een samenvatting van met de kernuitkomsten.</p>
          <div className="flex gap-2">
            <button disabled={bezig} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {bezig ? "Uploaden…" : "Toevoegen"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Annuleren
            </button>
          </div>
        </form>
      )}
      {fout && <p className="mt-2 text-sm text-rose-600">{fout}</p>}

      {docs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{d.titel}</p>
                  <p className="text-xs text-slate-500">
                    {d.soort === "eigen" ? "Eigen analyse" : `Analyse door ${d.auteur || "anderen"}${d.jaar ? ` (${d.jaar})` : ""}`}
                    {dvNaam(d.deelvraag_id) && ` · ${dvNaam(d.deelvraag_id)}`} · {d.bestand_naam}
                    {d.bron_id && " · staat in je bronnenlijst"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  {d.status === "bezig" && <span className="animate-pulse text-violet-700">Samenvatting wordt gemaakt…</span>}
                  {d.status === "fout" && (
                    <button onClick={() => vat(d.id)} className="font-medium text-rose-600 hover:underline">
                      Opnieuw proberen
                    </button>
                  )}
                  <button onClick={() => bekijk(d)} className="font-medium text-emerald-700 hover:underline">
                    Openen
                  </button>
                  <button onClick={() => verwijder(d)} className="text-slate-400 hover:text-rose-600">
                    Verwijderen
                  </button>
                </div>
              </div>
              {d.samenvatting && d.status !== "bezig" && (
                <button onClick={() => setUitgeklapt(uitgeklapt === d.id ? null : d.id)} className="mt-2 block w-full text-left">
                  <p className={`whitespace-pre-wrap text-sm ${d.status === "fout" ? "text-rose-700" : "text-slate-700"} ${uitgeklapt === d.id ? "" : "line-clamp-3"}`}>
                    {d.samenvatting}
                  </p>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
