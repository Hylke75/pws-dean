"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ANDERS,
  WEET_NIET,
  aantalZichtbaar,
  andersSleutel,
  labelsVoor,
  naarIndienen,
  opschonen,
  optiesVoor,
  sleutel,
  stapBeantwoord,
  stappen,
  wisselKeuze,
  type Antwoorden,
  type Stap,
  type Vraag,
} from "@/lib/enquete";

type PublicSurvey = { title: string; intro: string | null; afsluiting: string | null; questions: Vraag[] };
type Fase = "laden" | "dicht" | "intro" | "vragen" | "verstuurd";

function lees<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function schrijf(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // privévenster of geblokkeerde opslag: dan zonder tussentijds bewaren
  }
}

export default function EnqueteInvullen({ token }: { token: string }) {
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [fase, setFase] = useState<Fase>("laden");
  const [stap, setStap] = useState(0);
  const [antwoorden, setAntwoorden] = useState<Antwoorden>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const klaarKey = `pws_enq_${token.toLowerCase()}`;
  const conceptKey = `pws_enq_concept_${token.toLowerCase()}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (lees(klaarKey)) {
        setFase("verstuurd");
      }
      const { data } = await supabase.rpc("pws_enquete_public", { p_token: token });
      if (cancelled) return;
      if (!data) {
        setFase((f) => (f === "verstuurd" ? f : "dicht"));
        return;
      }
      const s = data as PublicSurvey;
      s.questions = s.questions.map((q) => ({ ...q, config: q.config ?? {}, options: q.options ?? [] }));
      setSurvey(s);
      if (lees(klaarKey)) return;
      const concept = lees<{ antwoorden: Antwoorden; stap: number }>(conceptKey);
      if (concept) {
        setAntwoorden(concept.antwoorden);
        setStap(concept.stap);
        setFase("vragen");
      } else {
        setFase("intro");
      }
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const lijst = useMemo(() => (survey ? stappen(survey.questions, antwoorden) : []), [survey, antwoorden]);
  const huidig: Stap | undefined = lijst[Math.min(stap, lijst.length - 1)];
  const laatste = stap >= lijst.length - 1;

  useEffect(() => {
    if (fase === "vragen") schrijf(conceptKey, { antwoorden, stap });
  }, [fase, antwoorden, stap, conceptKey]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stap, fase]);

  function zet(key: string, waarde: string[]) {
    setAntwoorden((a) => (survey ? opschonen(survey.questions, { ...a, [key]: waarde }) : { ...a, [key]: waarde }));
  }

  function volgende() {
    if (timer.current) clearTimeout(timer.current);
    if (!laatste) setStap((s) => s + 1);
  }
  function vorige() {
    if (timer.current) clearTimeout(timer.current);
    if (stap === 0) setFase("intro");
    else setStap((s) => s - 1);
  }

  /** Eén keuze tikken = antwoord geven én door naar de volgende vraag. */
  function kiesEnDoor(key: string, waarde: string, blijf = false) {
    zet(key, [waarde]);
    if (laatste || blijf) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStap((s) => s + 1), 280);
  }

  async function versturen() {
    if (!survey) return;
    const open = lijst.findIndex((s) => s.vraag.required && !stapBeantwoord(s, antwoorden));
    if (open >= 0) {
      setStap(open);
      setErr("Deze vraag is nog niet beantwoord.");
      return;
    }
    setErr("");
    setBusy(true);
    const { data, error } = await supabase.rpc("pws_enquete_indienen", {
      p_token: token,
      p_answers: naarIndienen(survey.questions, antwoorden),
    });
    setBusy(false);
    if (!error && data?.ok) {
      schrijf(klaarKey, true);
      schrijf(conceptKey, null);
      setFase("verstuurd");
    } else {
      setErr(data?.error === "gesloten" ? "Deze enquête is inmiddels gesloten." : "Versturen lukte niet. Controleer je internetverbinding en probeer het nog eens.");
    }
  }

  if (fase === "laden") {
    return (
      <Scherm>
        <p className="py-24 text-center text-slate-500">Laden…</p>
      </Scherm>
    );
  }

  if (fase === "dicht") {
    return (
      <Scherm>
        <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-4xl" aria-hidden>🔒</p>
          <p className="mt-3 text-lg font-semibold text-slate-800">Deze enquête is niet (meer) beschikbaar.</p>
          <p className="mt-1 text-slate-500">Controleer de link of vraag om een nieuwe.</p>
        </div>
      </Scherm>
    );
  }

  if (fase === "verstuurd") {
    return (
      <Scherm>
        <div className="mt-16 rounded-2xl border border-emerald-200 bg-white p-8 text-center">
          <p className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden>✓</p>
          <p className="mt-4 text-xl font-semibold text-slate-900">{survey?.afsluiting || "Bedankt voor het invullen!"}</p>
          <p className="mt-2 text-slate-500">Je antwoorden zijn anoniem opgeslagen. Je kunt dit venster sluiten.</p>
        </div>
      </Scherm>
    );
  }

  if (!survey) return null;

  if (fase === "intro") {
    const aantal = survey.questions.length;
    return (
      <Scherm>
        <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
          <div className="flex-1 pt-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Enquête · {aantal} vragen</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{survey.title}</h1>
            {survey.intro && <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-slate-700">{survey.intro}</p>}
            <ul className="mt-6 space-y-2 text-slate-600">
                            <li className="flex gap-2"><span aria-hidden>🔒</span> Anoniem: er wordt geen naam gevraagd</li>
              {survey.questions.some((q) => q.type !== "open") && (
                <li className="flex gap-2"><span aria-hidden>👆</span> Tik op een antwoord om door te gaan</li>
              )}
            </ul>
          </div>
          <div className="sticky bottom-0 bg-slate-50 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <button
              onClick={() => setFase("vragen")}
              className="h-14 w-full rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-sm active:bg-emerald-700"
            >
              Start
            </button>
          </div>
        </div>
      </Scherm>
    );
  }

  if (!huidig) return null;
  const { vraag, item, nr } = huidig;
  const key = sleutel(vraag.id, item);
  const gekozen = antwoorden[key] ?? [];
  const beantwoord = stapBeantwoord(huidig, antwoorden);
  const voortgang = Math.round((stap / lijst.length) * 100);
  const vorigeSectie = stap > 0 ? lijst[stap - 1].vraag.section : null;

  return (
    <Scherm>
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
        {/* Voortgang */}
        <div className="sticky top-0 z-10 -mx-4 bg-slate-50/95 px-4 pb-3 pt-3 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Vraag {nr} van {aantalZichtbaar(survey.questions, antwoorden)}</span>
            <span>{voortgang}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={voortgang} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${voortgang}%` }} />
          </div>
        </div>

        <div key={key} className="enq-stap flex-1 pb-4 pt-3">
          {vraag.section && vraag.section !== vorigeSectie && (
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-emerald-700">{vraag.section}</p>
          )}

          {vraag.type === "stellingen" && item !== undefined ? (
            <>
              <p className="text-base text-slate-500">
                {vraag.text} <span className="whitespace-nowrap">· {item + 1} van {vraag.config.items?.length}</span>
              </p>
              <h2 className="mt-2 text-xl font-semibold leading-snug text-slate-900">{vraag.config.items?.[item]}</h2>
            </>
          ) : (
            <h2 className="text-xl font-semibold leading-snug text-slate-900">
              {vraag.text}
              {!vraag.required && <span className="ml-1 text-base font-normal text-slate-400">(niet verplicht)</span>}
            </h2>
          )}

          {vraag.type === "meerdere" && (
            <p className="mt-1 text-slate-500">
              {vraag.config.max ? `Kies maximaal ${vraag.config.max}` : "Meerdere antwoorden mogelijk"}
              {vraag.config.max ? ` · ${gekozen.length} gekozen` : ""}
            </p>
          )}

          <div className="mt-4">
            {(vraag.type === "meerkeuze" || vraag.type === "janee") && (
              <div className="space-y-2">
                {optiesVoor(vraag, antwoorden).map((opt) => (
                  <Keuze
                    key={opt}
                    rond
                    actief={gekozen[0] === opt}
                    onClick={() => kiesEnDoor(key, opt, opt === ANDERS && !!vraag.config.andersTekst)}
                  >
                    {opt}
                  </Keuze>
                ))}
                {vraag.config.andersTekst && gekozen.includes(ANDERS) && (
                  <AndersVeld waarde={antwoorden[andersSleutel(vraag.id)]?.[0] ?? ""} onChange={(t) => zet(andersSleutel(vraag.id), [t])} />
                )}
              </div>
            )}

            {vraag.type === "meerdere" && (
              <div className="space-y-2">
                {vraag.options.map((opt) => {
                  const actief = gekozen.includes(opt);
                  const vol = !actief && !!vraag.config.max && gekozen.filter((g) => !(vraag.config.exclusief ?? []).includes(g)).length >= vraag.config.max && !(vraag.config.exclusief ?? []).includes(opt);
                  return (
                    <Keuze key={opt} actief={actief} gedimd={vol} onClick={() => zet(key, wisselKeuze(gekozen, opt, vraag.config))}>
                      {opt}
                    </Keuze>
                  );
                })}
                {vraag.config.andersTekst && gekozen.includes(ANDERS) && (
                  <AndersVeld waarde={antwoorden[andersSleutel(vraag.id)]?.[0] ?? ""} onChange={(t) => zet(andersSleutel(vraag.id), [t])} />
                )}
              </div>
            )}

            {(vraag.type === "schaal" || vraag.type === "stellingen") && (
              <div className="space-y-2">
                {labelsVoor(vraag).map((label, i) => (
                  <Keuze key={label} rond actief={gekozen[0] === String(i + 1)} onClick={() => kiesEnDoor(key, String(i + 1))}>
                    {label}
                  </Keuze>
                ))}
                {vraag.config.weetNiet && (
                  <button
                    type="button"
                    onClick={() => kiesEnDoor(key, WEET_NIET)}
                    aria-pressed={gekozen[0] === WEET_NIET}
                    className={`mt-1 h-12 w-full rounded-xl border text-base transition ${
                      gekozen[0] === WEET_NIET
                        ? "border-slate-500 bg-slate-100 font-semibold text-slate-800"
                        : "border-dashed border-slate-300 text-slate-500 active:bg-slate-100"
                    }`}
                  >
                    {vraag.config.weetNietLabel || "Weet ik niet"}
                  </button>
                )}
              </div>
            )}

            {vraag.type === "open" && (
              <div>
                <textarea
                  value={gekozen[0] ?? ""}
                  onChange={(e) => zet(key, [e.target.value])}
                  maxLength={vraag.config.maxLengte ?? 2000}
                  rows={(vraag.config.maxLengte ?? 2000) > 300 ? 6 : 4}
                  placeholder="Antwoord…"
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-base leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                {vraag.config.maxLengte && (
                  <p className="mt-1 text-right text-sm text-slate-400">
                    {(gekozen[0] ?? "").length}/{vraag.config.maxLengte}
                  </p>
                )}
              </div>
            )}
          </div>

          {err && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-red-700">{err}</p>}
        </div>

        {/* Navigatie */}
        <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-slate-200 bg-slate-50/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <button
            type="button"
            onClick={vorige}
            aria-label="Vorige vraag"
            className="h-14 w-14 shrink-0 rounded-2xl border border-slate-300 bg-white text-xl text-slate-600 active:bg-slate-100"
          >
            ←
          </button>
          {laatste ? (
            <button
              type="button"
              onClick={versturen}
              disabled={busy || (vraag.required && !beantwoord)}
              className="h-14 flex-1 rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-sm active:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Versturen…" : "Versturen"}
            </button>
          ) : (
            <button
              type="button"
              onClick={volgende}
              disabled={vraag.required && !beantwoord}
              className="h-14 flex-1 rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-sm active:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500"
            >
              {beantwoord ? "Volgende" : vraag.required ? "Kies een antwoord" : "Overslaan"}
            </button>
          )}
        </div>
      </div>
    </Scherm>
  );
}

function AndersVeld({ waarde, onChange }: { waarde: string; onChange: (t: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);
  return (
    <input
      ref={ref}
      value={waarde}
      onChange={(e) => onChange(e.target.value)}
      maxLength={200}
      placeholder="Namelijk…"
      aria-label="Anders, namelijk"
      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
  );
}

function Scherm({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 pt-3">
      <div className="mx-auto max-w-lg">{children}</div>
    </main>
  );
}

function Keuze({
  actief,
  rond,
  gedimd,
  onClick,
  children,
}: {
  actief: boolean;
  rond?: boolean;
  gedimd?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className={`flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left text-base transition active:scale-[0.99] ${
        actief
          ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-900"
          : gedimd
            ? "border-slate-200 bg-white text-slate-400"
            : "border-slate-200 bg-white text-slate-800 active:bg-slate-50"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 text-xs text-white ${rond ? "rounded-full" : "rounded-md"} ${
          actief ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
        }`}
      >
        {actief && "✓"}
      </span>
      <span>{children}</span>
    </button>
  );
}
