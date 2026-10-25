"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { woorden, type Hoofdstuk, type SchrijfVeld } from "@/lib/verslag";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";
import { naarTekst } from "@/lib/opmaak";
import TekstEditor from "@/components/verslag/TekstEditor";
import AiHulp from "@/components/verslag/AiHulp";
import type { VerslagSectie } from "@/lib/types";

type Veld = { notes: string; klaar: boolean };
type Opslag = "opgeslagen" | "bezig" | "fout";

function ankerId(key: string) {
  return `h-${key.replace(/[^a-z0-9]/gi, "-")}`;
}

export default function VerslagClient({
  hoofdstukken,
  initial,
  aiAan,
}: {
  hoofdstukken: Hoofdstuk[];
  initial: VerslagSectie[];
  aiAan: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [velden, setVelden] = useState<Record<string, Veld>>(() =>
    Object.fromEntries(initial.map((s) => [s.section_key, { notes: s.notes ?? "", klaar: s.status === "klaar" }])),
  );
  const [opslag, setOpslag] = useState<Record<string, Opslag>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const vuil = useRef<Set<string>>(new Set());
  const [heeftVuil, setHeeftVuil] = useState(false);
  useUnsavedWarning(heeftVuil);

  const alleVelden = hoofdstukken.flatMap((h) => h.schrijven);
  const veld = (key: string): Veld => velden[key] ?? { notes: "", klaar: false };

  async function bewaar(key: string, v: Veld) {
    setOpslag((o) => ({ ...o, [key]: "bezig" }));
    const status = v.klaar ? "klaar" : v.notes.trim() ? "bezig" : "te_doen";
    const { error } = await supabase
      .from("pws_verslag_secties")
      .upsert({ section_key: key, status, notes: v.notes || null }, { onConflict: "section_key" });
    vuil.current.delete(key);
    setHeeftVuil(vuil.current.size > 0);
    setOpslag((o) => ({ ...o, [key]: error ? "fout" : "opgeslagen" }));
  }

  function wijzig(key: string, patch: Partial<Veld>, direct = false) {
    const nieuw = { ...veld(key), ...patch };
    setVelden((x) => ({ ...x, [key]: nieuw }));
    clearTimeout(timers.current[key]);
    vuil.current.add(key);
    setHeeftVuil(true);
    if (direct) bewaar(key, nieuw);
    else timers.current[key] = setTimeout(() => bewaar(key, nieuw), 1200);
  }

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  const geschreven = alleVelden.filter((f) => veld(f.key).notes.trim()).length;
  const klaar = alleVelden.filter((f) => veld(f.key).klaar).length;
  const totaalWoorden = alleVelden.reduce((s, f) => s + woorden(naarTekst(veld(f.key).notes)), 0);
  const pct = alleVelden.length ? Math.round((klaar / alleVelden.length) * 100) : 0;

  return (
    <div>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-slate-500">Stukken klaar</p>
          <p className="text-sm font-medium text-slate-500">
            {klaar}/{alleVelden.length}
          </p>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {geschreven} van de {alleVelden.length} stukken begonnen · ≈ {totaalWoorden} woorden (~
          {(totaalWoorden / 300).toFixed(1).replace(".", ",")} pagina&apos;s) · richtlijn: minimaal 15 pagina&apos;s
        </p>
      </div>

      <nav className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Inhoud</p>
        <ol className="mt-2 space-y-1 text-sm">
          {hoofdstukken.map((h) => {
            const nog = h.schrijven.filter((f) => !veld(f.key).notes.trim()).length;
            return (
              <li key={h.key} className="flex items-center justify-between gap-3">
                <a href={`#${ankerId(h.key)}`} className="truncate text-slate-700 hover:text-emerald-700 hover:underline">
                  {h.nummer && <span className="mr-1.5 font-medium text-slate-500">{h.nummer}</span>}
                  {h.titel}
                </a>
                {h.schrijven.length === 0 ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">automatisch</span>
                ) : nog > 0 ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">nog {nog} schrijven</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">geschreven</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="space-y-6">
        {hoofdstukken.map((h) => (
          <section key={h.key} id={ankerId(h.key)} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {h.bijlage ? h.nummer : h.nummer ? `Hoofdstuk ${h.nummer}` : " "}
            </p>
            <h2 className="text-lg font-bold text-slate-900">{h.titel}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{h.uitleg}</p>

            {h.aandacht && h.aandacht.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {h.aandacht.map((a) => (
                  <li key={a}>⚠ {a}</li>
                ))}
              </ul>
            )}

            {h.auto.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setOpen((o) => ({ ...o, [h.key]: !o[h.key] }))}
                  className="text-xs font-semibold uppercase tracking-wide text-emerald-700 hover:underline"
                >
                  {open[h.key] ? "▾" : "▸"} Al in het systeem ({h.auto.length})
                </button>
                {open[h.key] && (
                  <div className="mt-2 space-y-2">
                    {h.auto.map((b, i) => (
                      <div key={i} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-emerald-900">{b.titel}</p>
                          {b.link && (
                            <a href={b.link.href} className="shrink-0 text-xs font-medium text-emerald-700 hover:underline">
                              {b.link.label} →
                            </a>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{b.tekst}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {h.verzamel && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{h.verzamel.titel}</p>
                <ul className="mt-1 space-y-1.5 text-sm text-slate-700">
                  {h.verzamel.velden.map((v) => (
                    <li key={v.key}>
                      <span className="font-medium">{v.label}: </span>
                      {naarTekst(veld(v.key).notes) || <span className="italic text-slate-400">nog niet geschreven</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {h.schrijven.length > 0 && (
              <div className="mt-4 space-y-4">
                {h.schrijven.map((f) => (
                  <SchrijfBlok
                    key={f.key}
                    veld={f}
                    waarde={veld(f.key)}
                    opslag={opslag[f.key]}
                    aiAan={aiAan}
                    onWijzig={(patch, direct) => wijzig(f.key, patch, direct)}
                    onBlur={() => {
                      if (vuil.current.has(f.key)) {
                        clearTimeout(timers.current[f.key]);
                        bewaar(f.key, veld(f.key));
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function SchrijfBlok({
  veld,
  waarde,
  opslag,
  aiAan,
  onWijzig,
  onBlur,
}: {
  veld: SchrijfVeld;
  waarde: Veld;
  opslag?: Opslag;
  aiAan: boolean;
  onWijzig: (patch: Partial<Veld>, direct?: boolean) => void;
  onBlur: () => void;
}) {
  const leeg = !waarde.notes.trim();
  const rand = waarde.klaar ? "border-emerald-200 bg-white" : leeg ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white";
  const klasse = "w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-emerald-500";

  return (
    <div className={`rounded-xl border p-3 ${rand}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{veld.label}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            waarde.klaar ? "bg-emerald-100 text-emerald-700" : leeg ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-700"
          }`}
        >
          {waarde.klaar ? "Klaar" : leeg ? "Nog schrijven" : "Concept"}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{veld.hint}</p>
      {leeg && veld.start?.trim() && (
        <button
          onClick={() => onWijzig({ notes: veld.start! }, true)}
          className="mt-1.5 text-xs font-medium text-emerald-700 hover:underline"
        >
          + Begin met wat al in het systeem staat
        </button>
      )}
      <div className="mt-2">
        {veld.regels === 1 ? (
          <input value={waarde.notes} onChange={(e) => onWijzig({ notes: e.target.value })} onBlur={onBlur} className={klasse} />
        ) : (
          <TekstEditor waarde={waarde.notes} onChange={(html) => onWijzig({ notes: html })} onBlur={onBlur} />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>
          {veld.regels === 1 ? "" : `${woorden(naarTekst(waarde.notes))} woorden`}
          {opslag === "bezig" && " · opslaan…"}
          {opslag === "opgeslagen" && " · opgeslagen ✓"}
          {opslag === "fout" && <span className="text-rose-600"> · niet opgeslagen, probeer het opnieuw</span>}
        </span>
        {!leeg && (
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={waarde.klaar} onChange={(e) => onWijzig({ klaar: e.target.checked }, true)} />
            Klaar
          </label>
        )}
      </div>
      {aiAan && veld.regels !== 1 && (
        <AiHulp veldKey={veld.key} tekst={waarde.notes} onGebruik={(html) => onWijzig({ notes: html }, true)} />
      )}
    </div>
  );
}
