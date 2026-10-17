"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { geschatteMinuten, type IvToestemming, type IvVraag } from "@/lib/interview";

export type IvOpenData = {
  status: "uitgenodigd" | "gestart" | "afgerond" | "gesloten";
  naam: string;
  functie: string | null;
  organisatie: string | null;
  type_naam: string;
  aanspreekvorm: "u" | "je";
  intro: string | null;
  boodschap: string | null;
  vragen: IvVraag[];
  antwoorden: Record<string, string>;
  toestemming: IvToestemming | null;
  laatst_opgeslagen: string | null;
  contact_email: string | null;
  ai_aan: boolean;
  bewaartermijn_maanden: number;
};

type Fase = "laden" | "ongeldig" | "gesloten" | "afgerond" | "intro" | "toestemming" | "vragen" | "controle" | "verstuurd";
type Opslag = "opgeslagen" | "bezig" | "fout" | "wijziging";

const tijd = (iso: string) => new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

/**
 * Het digitale interview. Met `voorbeeld` wordt niets opgeslagen (vooraf bekijken door de beheerder).
 */
export default function InterviewInvullen({ token, voorbeeld }: { token?: string; voorbeeld?: IvOpenData }) {
  const supabase = createClient();
  const [data, setData] = useState<IvOpenData | null>(voorbeeld ?? null);
  const [fase, setFase] = useState<Fase>(voorbeeld ? "intro" : "laden");
  const [stap, setStap] = useState(0);
  const [antwoorden, setAntwoorden] = useState<Record<string, string>>(voorbeeld?.antwoorden ?? {});
  const [opslag, setOpslag] = useState<Opslag>("opgeslagen");
  const [opgeslagenOp, setOpgeslagenOp] = useState<string | null>(null);
  const [fout, setFout] = useState("");
  const [overzicht, setOverzicht] = useState(false);
  const vuil = useRef<Set<string>>(new Set());
  // Altijd de actuele antwoorden, ook binnen een lopende opslagactie.
  const antwRef = useRef<Record<string, string>>(voorbeeld?.antwoorden ?? {});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupKey = token ? `pws_iv_${token.slice(0, 12)}` : "";
  const je = data?.aanspreekvorm === "je";
  const t = (u: string, j: string) => (je ? j : u);

  // Laden: antwoorden van de server, aangevuld met een lokale reservekopie van niet-opgeslagen tekst.
  useEffect(() => {
    if (voorbeeld || !token) return;
    let weg = false;
    (async () => {
      const { data: d, error } = await supabase.rpc("pws_iv_open", { p_token: token });
      if (weg) return;
      if (error || !d) {
        setFase("ongeldig");
        return;
      }
      const open = d as IvOpenData;
      setData(open);
      if (open.status === "gesloten") return setFase("gesloten");
      if (open.status === "afgerond") return setFase("afgerond");
      let antw = { ...open.antwoorden };
      try {
        const backup = JSON.parse(localStorage.getItem(backupKey) ?? "null") as Record<string, string> | null;
        if (backup) {
          for (const [k, v] of Object.entries(backup)) {
            if (v !== (antw[k] ?? "")) vuil.current.add(k);
          }
          antw = { ...antw, ...backup };
        }
      } catch {
        // geen lokale opslag beschikbaar
      }
      antwRef.current = antw;
      setAntwoorden(antw);
      setOpgeslagenOp(open.laatst_opgeslagen);
      if (vuil.current.size) setOpslag("wijziging");
      setFase("intro");
    })();
    return () => {
      weg = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const opslaan = useCallback(async () => {
    if (voorbeeld || !token || vuil.current.size === 0) return true;
    const payload: Record<string, string> = Object.fromEntries([...vuil.current].map((k) => [k, antwRef.current[k] ?? ""]));
    setOpslag("bezig");
    const { data: r, error } = await supabase.rpc("pws_iv_opslaan", { p_token: token, p_antwoorden: payload });
    if (error || !r?.ok) {
      setOpslag("fout");
      return false;
    }
    // Alleen als 'schoon' markeren wat sinds het versturen niet opnieuw is gewijzigd.
    for (const [k, v] of Object.entries(payload)) if ((antwRef.current[k] ?? "") === v) vuil.current.delete(k);
    setOpgeslagenOp(r.opgeslagen_op);
    setOpslag(vuil.current.size ? "wijziging" : "opgeslagen");
    try {
      if (vuil.current.size) {
        localStorage.setItem(backupKey, JSON.stringify(Object.fromEntries([...vuil.current].map((k) => [k, antwRef.current[k] ?? ""]))));
      } else {
        localStorage.removeItem(backupKey);
      }
    } catch {
      // niets
    }
    return true;
  }, [supabase, token, voorbeeld, backupKey]);

  function wijzig(key: string, waarde: string) {
    antwRef.current = { ...antwRef.current, [key]: waarde };
    setAntwoorden(antwRef.current);
    vuil.current.add(key);
    if (!voorbeeld) {
      try {
        const backup = Object.fromEntries([...vuil.current].map((k) => [k, antwRef.current[k] ?? ""]));
        localStorage.setItem(backupKey, JSON.stringify(backup));
      } catch {
        // geen lokale opslag beschikbaar
      }
    }
    setOpslag("wijziging");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void opslaan(), 1500);
  }

  // Waarschuwen bij sluiten met niet-opgeslagen tekst.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (vuil.current.size) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stap, fase]);

  async function naar(fase2: Fase, stap2?: number) {
    if (timer.current) clearTimeout(timer.current);
    await opslaan();
    if (stap2 !== undefined) setStap(stap2);
    setFase(fase2);
    setOverzicht(false);
  }

  async function versturen() {
    setFout("");
    if (voorbeeld) return setFase("verstuurd");
    if (!(await opslaan())) {
      setFout(t("Uw antwoorden konden niet worden opgeslagen. Controleer uw internetverbinding en probeer het opnieuw.", "Je antwoorden konden niet worden opgeslagen. Controleer je internetverbinding en probeer het opnieuw."));
      return;
    }
    const { data: r } = await supabase.rpc("pws_iv_afronden", { p_token: token });
    if (r?.ok) {
      setFase("verstuurd");
    } else if (r?.error === "verplicht") {
      setFout(t(`Er ${r.aantal === 1 ? "is nog 1 verplichte vraag" : `zijn nog ${r.aantal} verplichte vragen`} niet beantwoord.`, `Er ${r.aantal === 1 ? "is nog 1 verplichte vraag" : `zijn nog ${r.aantal} verplichte vragen`} niet beantwoord.`));
    } else {
      setFout(t("Versturen lukte niet. Probeer het later opnieuw.", "Versturen lukte niet. Probeer het later opnieuw."));
    }
  }

  /* ---------------- Schermen ---------------- */

  if (fase === "laden") return <Kader><p className="py-24 text-center text-slate-500">Laden…</p></Kader>;

  if (fase === "ongeldig" || fase === "gesloten") {
    return (
      <Kader>
        <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-800">
            {fase === "gesloten" ? "Dit interview is gesloten." : "Deze link werkt niet (meer)."}
          </p>
          <p className="mt-2 text-slate-500">Neem contact op met Dean als u denkt dat dit niet klopt.</p>
        </div>
      </Kader>
    );
  }

  if (!data) return null;

  if (fase === "afgerond" || fase === "verstuurd") {
    return (
      <Kader>
        <div className="mt-16 rounded-2xl border border-emerald-200 bg-white p-8 text-center">
          <p className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden>✓</p>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            {t("Hartelijk dank voor uw bijdrage!", "Heel erg bedankt voor je bijdrage!")}
          </h1>
          <p className="mt-2 text-slate-600">
            {fase === "verstuurd"
              ? t("Uw antwoorden zijn verstuurd en veilig opgeslagen. U kunt dit venster sluiten.", "Je antwoorden zijn verstuurd en veilig opgeslagen. Je kunt dit venster sluiten.")
              : t("U heeft dit interview al ingestuurd. Wilt u nog iets aanpassen? Neem dan contact op met Dean.", "Je hebt dit interview al ingestuurd. Wil je nog iets aanpassen? Neem dan contact op met Dean.")}
          </p>
          {voorbeeld && <p className="mt-4 text-sm text-amber-700">Voorbeeldweergave: er is niets opgeslagen of verstuurd.</p>}
        </div>
      </Kader>
    );
  }

  const vragen = data.vragen;
  const minuten = geschatteMinuten(vragen.length);
  const beantwoord = vragen.filter((v) => (antwoorden[v.key] ?? "").trim()).length;

  if (fase === "intro") {
    return (
      <Kader>
        {voorbeeld && <VoorbeeldBalk />}
        <div className="pt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Interview · profielwerkstuk</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">AI en de arbeidsmarkt van de toekomst</h1>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Interview met", "Interview met")}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{data.naam}</p>
            {(data.functie || data.organisatie) && (
              <p className="text-slate-600">{[data.functie, data.organisatie].filter(Boolean).join(" · ")}</p>
            )}
            <p className="mt-1 text-sm text-slate-500">{data.type_naam}</p>
          </div>

          {data.boodschap && (
            <div className="mt-4 rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-slate-700">
              <p className="whitespace-pre-line">{data.boodschap}</p>
              <p className="mt-2 text-sm text-slate-500">– Dean</p>
            </div>
          )}

          {data.intro && <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-slate-700">{data.intro}</p>}

          <ul className="mt-6 space-y-2 text-slate-600">
            <li>⏱ {vragen.length} open vragen, ongeveer {minuten} minuten</li>
            <li>💾 {t("Uw antwoorden worden automatisch opgeslagen. U kunt stoppen en later via dezelfde link verdergaan.", "Je antwoorden worden automatisch opgeslagen. Je kunt stoppen en later via dezelfde link verdergaan.")}</li>
            {beantwoord > 0 && <li>✍️ {t(`U heeft al ${beantwoord} van de ${vragen.length} vragen beantwoord.`, `Je hebt al ${beantwoord} van de ${vragen.length} vragen beantwoord.`)}</li>}
          </ul>

          <div className="sticky bottom-0 mt-8 bg-slate-50 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button
              onClick={() => setFase(data.toestemming?.deelname || voorbeeld ? "vragen" : "toestemming")}
              className="h-14 w-full rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              {beantwoord > 0 ? t("Verdergaan", "Verdergaan") : t("Beginnen", "Beginnen")}
            </button>
          </div>
        </div>
      </Kader>
    );
  }

  if (fase === "toestemming") {
    return (
      <Kader>
        <Toestemming
          data={data}
          je={je}
          onTerug={() => setFase("intro")}
          onAkkoord={async (keuzes) => {
            if (voorbeeld) return setFase("vragen");
            const { data: r } = await supabase.rpc("pws_iv_toestemming", { p_token: token, p_keuzes: keuzes });
            if (r?.ok) {
              setData({ ...data, toestemming: { ...keuzes, gegeven_op: new Date().toISOString() } });
              setFase("vragen");
            } else {
              setFout("Opslaan lukte niet. Probeer het opnieuw.");
            }
          }}
          fout={fout}
        />
      </Kader>
    );
  }

  const status = (
    <span aria-live="polite" className="text-sm">
      {voorbeeld ? (
        <span className="text-amber-700">Voorbeeld: niets wordt opgeslagen</span>
      ) : opslag === "bezig" ? (
        <span className="text-slate-500">Opslaan…</span>
      ) : opslag === "fout" ? (
        <button onClick={() => void opslaan()} className="font-medium text-red-600 underline">
          Niet opgeslagen. Opnieuw proberen
        </button>
      ) : opslag === "wijziging" ? (
        <span className="text-slate-500">Wijzigingen worden opgeslagen…</span>
      ) : opgeslagenOp ? (
        <span className="text-emerald-700">✓ Opgeslagen om {tijd(opgeslagenOp)}</span>
      ) : null}
    </span>
  );

  if (fase === "controle") {
    const open = vragen.filter((v) => !(antwoorden[v.key] ?? "").trim());
    return (
      <Kader>
        {voorbeeld && <VoorbeeldBalk />}
        <div className="flex items-center justify-between pt-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Controleren en versturen</p>
          {status}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{t("Uw antwoorden", "Je antwoorden")}</h1>
        {open.length > 0 && (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-800">
            {t(`U heeft ${open.length} ${open.length === 1 ? "vraag" : "vragen"} nog niet beantwoord. Dat mag; u kunt ze ook nog invullen.`,
               `Je hebt ${open.length} ${open.length === 1 ? "vraag" : "vragen"} nog niet beantwoord. Dat mag; je kunt ze ook nog invullen.`)}
          </p>
        )}
        <ol className="mt-4 space-y-2">
          {vragen.map((v, i) => (
            <li key={v.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900">{i + 1}. {v.tekst}{v.verplicht && <span className="text-red-600"> *</span>}</p>
                <button onClick={() => naar("vragen", i)} className="shrink-0 text-sm font-medium text-emerald-700 underline">Wijzigen</button>
              </div>
              <p className={`mt-1 line-clamp-3 whitespace-pre-line text-sm ${(antwoorden[v.key] ?? "").trim() ? "text-slate-600" : "italic text-slate-400"}`}>
                {(antwoorden[v.key] ?? "").trim() || "Niet beantwoord"}
              </p>
            </li>
          ))}
        </ol>
        {fout && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-red-700">{fout}</p>}
        <div className="sticky bottom-0 mt-6 flex gap-3 border-t border-slate-200 bg-slate-50 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button onClick={() => naar("vragen", vragen.length - 1)} className="h-14 rounded-2xl border border-slate-300 bg-white px-5 font-medium text-slate-700">
            ← Terug
          </button>
          <VerstuurKnop je={je} onVerstuur={versturen} />
        </div>
      </Kader>
    );
  }

  // Vragen, één tegelijk
  const v = vragen[Math.min(stap, vragen.length - 1)];
  const waarde = antwoorden[v.key] ?? "";
  const laatste = stap >= vragen.length - 1;
  const voortgang = Math.round((beantwoord / vragen.length) * 100);

  return (
    <Kader>
      {voorbeeld && <VoorbeeldBalk />}
      <div className="sticky top-0 z-10 -mx-4 bg-slate-50/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
          <button onClick={() => setOverzicht((o) => !o)} aria-expanded={overzicht} className="font-medium text-slate-600 underline-offset-2 hover:underline">
            Vraag {stap + 1} van {vragen.length} ▾
          </button>
          {status}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={voortgang} aria-valuemin={0} aria-valuemax={100} aria-label={`${beantwoord} van ${vragen.length} vragen beantwoord`}>
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${voortgang}%` }} />
        </div>
        {overzicht && (
          <ol className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-sm">
            {vragen.map((q, i) => (
              <li key={q.key}>
                <button onClick={() => naar("vragen", i)} className={`flex w-full gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 ${i === stap ? "bg-emerald-50" : ""}`}>
                  <span aria-hidden className={(antwoorden[q.key] ?? "").trim() ? "text-emerald-600" : "text-slate-300"}>●</span>
                  <span className="line-clamp-1 text-slate-700">{i + 1}. {q.tekst}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div key={v.key} className="pb-4 pt-4">
        {v.algemeen && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Algemene vraag</p>}
        <label htmlFor="antwoord" className="block text-xl font-semibold leading-snug text-slate-900">
          {v.tekst}
          {v.verplicht ? <span className="text-red-600"> *</span> : <span className="ml-1 text-base font-normal text-slate-400">(niet verplicht)</span>}
        </label>
        {v.toelichting && <p className="mt-1 text-slate-500">{v.toelichting}</p>}
        <textarea
          id="antwoord"
          value={waarde}
          onChange={(e) => wijzig(v.key, e.target.value)}
          onBlur={() => void opslaan()}
          rows={10}
          maxLength={20000}
          placeholder={t("Typ hier uw antwoord…", "Typ hier je antwoord…")}
          className="mt-4 min-h-[14rem] w-full resize-y rounded-2xl border border-slate-300 bg-white p-4 text-base leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <p className="mt-1 text-right text-sm text-slate-400">{waarde.trim() ? `${waarde.trim().split(/\s+/).length} woorden` : ""}</p>
      </div>

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-slate-200 bg-slate-50/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <button
          onClick={() => (stap === 0 ? naar("intro") : naar("vragen", stap - 1))}
          aria-label="Vorige vraag"
          className="h-14 w-14 shrink-0 rounded-2xl border border-slate-300 bg-white text-xl text-slate-600"
        >
          ←
        </button>
        <button
          onClick={() => (laatste ? naar("controle") : naar("vragen", stap + 1))}
          className="h-14 flex-1 rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          {laatste ? "Controleren en versturen" : "Volgende vraag"}
        </button>
      </div>
    </Kader>
  );
}

function Kader({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 pt-3">
      <div className="mx-auto max-w-2xl">{children}</div>
    </main>
  );
}

function VoorbeeldBalk() {
  return (
    <p className="mb-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
      Voorbeeldweergave voor de beheerder. Antwoorden worden niet opgeslagen.
    </p>
  );
}

function VerstuurKnop({ je, onVerstuur }: { je: boolean; onVerstuur: () => Promise<void> }) {
  const [zeker, setZeker] = useState(false);
  const [bezig, setBezig] = useState(false);
  if (!zeker) {
    return (
      <button onClick={() => setZeker(true)} className="h-14 flex-1 rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-sm hover:bg-emerald-700">
        Definitief versturen
      </button>
    );
  }
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <p className="text-sm text-slate-700">
        {je ? "Na het versturen kun je je antwoorden niet meer wijzigen. Versturen?" : "Na het versturen kunt u uw antwoorden niet meer wijzigen. Versturen?"}
      </p>
      <div className="flex gap-2">
        <button
          disabled={bezig}
          onClick={async () => {
            setBezig(true);
            await onVerstuur();
            setBezig(false);
          }}
          className="h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-60"
        >
          {bezig ? "Versturen…" : "Ja, versturen"}
        </button>
        <button onClick={() => setZeker(false)} className="h-12 rounded-xl px-4 text-slate-600 hover:bg-slate-100">Annuleren</button>
      </div>
    </div>
  );
}

function Toestemming({
  data,
  je,
  onAkkoord,
  onTerug,
  fout,
}: {
  data: IvOpenData;
  je: boolean;
  onAkkoord: (k: { deelname: boolean; naam_vermelden: boolean; citeren: boolean; ai: boolean }) => Promise<void>;
  onTerug: () => void;
  fout: string;
}) {
  const t = (u: string, j: string) => (je ? j : u);
  const [deelname, setDeelname] = useState(false);
  const [naam, setNaam] = useState<boolean | null>(null);
  const [citeren, setCiteren] = useState<boolean | null>(null);
  const [ai, setAi] = useState<boolean | null>(data.ai_aan ? null : false);
  const [bezig, setBezig] = useState(false);
  const klaar = deelname && naam !== null && citeren !== null && ai !== null;
  const contact = data.contact_email
    ? <a className="font-medium text-emerald-700 underline" href={`mailto:${data.contact_email}`}>{data.contact_email}</a>
    : t("de persoon die u deze link stuurde", "de persoon die je deze link stuurde");

  return (
    <div className="pb-8 pt-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Voordat {t("u begint", "je begint")}</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Privacy en toestemming</h1>
      <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">
        <p>{t("Dit interview is onderdeel van het profielwerkstuk van Dean (6 vwo) over AI en de arbeidsmarkt.", "Dit interview is onderdeel van het profielwerkstuk van Dean (6 vwo) over AI en de arbeidsmarkt.")}</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Wat wordt opgeslagen:</strong> {t("uw naam, functie, organisatie, e-mailadres (als Dean dat heeft ingevuld) en uw antwoorden.", "je naam, functie, organisatie, e-mailadres (als Dean dat heeft ingevuld) en je antwoorden.")}</li>
          <li><strong>Wie leest mee:</strong> {t("alleen Dean en de begeleiders van zijn profielwerkstuk.", "alleen Dean en de begeleiders van zijn profielwerkstuk.")}</li>
          <li><strong>Hoe lang:</strong> {t(`uiterlijk ${data.bewaartermijn_maanden} maanden na het insturen worden uw gegevens verwijderd.`, `uiterlijk ${data.bewaartermijn_maanden} maanden na het insturen worden je gegevens verwijderd.`)}</li>
          <li><strong>Correctie of verwijdering:</strong> {t("u kunt altijd vragen om uw antwoorden aan te passen of te verwijderen, ook na het insturen. Neem daarvoor contact op met", "je kunt altijd vragen om je antwoorden aan te passen of te verwijderen, ook na het insturen. Neem daarvoor contact op met")} {contact}.</li>
          {data.ai_aan && (
            <li><strong>AI-hulpmiddel:</strong> {t("alleen als u daar hieronder toestemming voor geeft, kan Dean een AI-hulpmiddel (Claude van Anthropic) gebruiken om antwoorden samen te vatten en te vergelijken. Uw naam en organisatie worden daarbij niet meegestuurd. Dean controleert alles zelf.", "alleen als je daar hieronder toestemming voor geeft, kan Dean een AI-hulpmiddel (Claude van Anthropic) gebruiken om antwoorden samen te vatten en te vergelijken. Je naam en organisatie worden daarbij niet meegestuurd. Dean controleert alles zelf.")}</li>
          )}
        </ul>
      </div>

      <div className="mt-5 space-y-5">
        <label className="flex items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
          <input type="checkbox" checked={deelname} onChange={(e) => setDeelname(e.target.checked)} className="mt-1 h-5 w-5 accent-emerald-600" />
          <span className="text-slate-800">{t("Ik doe mee en ga akkoord dat mijn antwoorden voor dit profielwerkstuk worden gebruikt.", "Ik doe mee en ga akkoord dat mijn antwoorden voor dit profielwerkstuk worden gebruikt.")}</span>
        </label>

        <Keuze
          vraag={t("Mag uw naam en organisatie in het profielwerkstuk worden genoemd?", "Mag je naam en organisatie in het profielwerkstuk worden genoemd?")}
          ja={t("Ja, mijn naam en organisatie mogen worden genoemd", "Ja, mijn naam en organisatie mogen worden genoemd")}
          nee={t("Nee, verwerk mijn antwoorden anoniem", "Nee, verwerk mijn antwoorden anoniem")}
          waarde={naam}
          onChange={setNaam}
        />
        <Keuze
          vraag={t("Mogen uw antwoorden letterlijk worden geciteerd?", "Mogen je antwoorden letterlijk worden geciteerd?")}
          ja="Ja, letterlijke citaten mogen"
          nee={t("Nee, alleen in eigen woorden weergeven", "Nee, alleen in eigen woorden weergeven")}
          waarde={citeren}
          onChange={setCiteren}
        />
        {data.ai_aan && (
          <Keuze
            vraag={t("Mag Dean een AI-hulpmiddel gebruiken om uw antwoorden samen te vatten?", "Mag Dean een AI-hulpmiddel gebruiken om je antwoorden samen te vatten?")}
            ja="Ja, dat mag (zonder naam en organisatie)"
            nee="Nee, liever niet"
            waarde={ai}
            onChange={setAi}
          />
        )}
      </div>

      {fout && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-red-700">{fout}</p>}

      <div className="sticky bottom-0 mt-6 flex gap-3 border-t border-slate-200 bg-slate-50 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button onClick={onTerug} aria-label="Terug" className="h-14 w-14 shrink-0 rounded-2xl border border-slate-300 bg-white text-xl text-slate-600">←</button>
        <button
          disabled={!klaar || bezig}
          onClick={async () => {
            setBezig(true);
            await onAkkoord({ deelname, naam_vermelden: !!naam, citeren: !!citeren, ai: !!ai });
            setBezig(false);
          }}
          className="h-14 flex-1 rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-sm disabled:bg-slate-300 disabled:text-slate-500"
        >
          {klaar ? "Akkoord, naar de vragen" : t("Maak eerst uw keuzes", "Maak eerst je keuzes")}
        </button>
      </div>
    </div>
  );
}

function Keuze({
  vraag,
  ja,
  nee,
  waarde,
  onChange,
}: {
  vraag: string;
  ja: string;
  nee: string;
  waarde: boolean | null;
  onChange: (b: boolean) => void;
}) {
  return (
    <fieldset>
      <legend className="font-semibold text-slate-900">{vraag}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {[
          [true, ja],
          [false, nee],
        ].map(([w, label]) => (
          <label
            key={String(w)}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 ${waarde === w ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}
          >
            <input type="radio" name={vraag} checked={waarde === w} onChange={() => onChange(w as boolean)} className="mt-1 h-5 w-5 accent-emerald-600" />
            <span className="text-slate-800">{label as string}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
