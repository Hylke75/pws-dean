"use client";

import { useState } from "react";

type Fase = { stap: "dicht" } | { stap: "laden"; wat: string } | { stap: "vragen"; vragen: string[] } | { stap: "voorstel"; html: string; vragen: string[] };

/** AI stelt Dean vragen over dit stuk; met zijn antwoorden herschrijft de AI de tekst. Dean kiest zelf of hij hem overneemt. */
export default function AiHulp({ veldKey, tekst, onGebruik }: { veldKey: string; tekst: string; onGebruik: (html: string) => void }) {
  const [fase, setFase] = useState<Fase>({ stap: "dicht" });
  const [antwoorden, setAntwoorden] = useState<string[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  async function vraag(body: object): Promise<Record<string, unknown> | null> {
    setFout(null);
    try {
      const res = await fetch("/api/verslag/schrijfhulp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ veld: veldKey, tekst, ...body }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (data.ok) return data;
      setFout(data.reason === "no_key" ? "De AI-hulp staat nu niet aan." : "Dat lukte niet. Probeer het zo nog eens.");
    } catch {
      setFout("Dat lukte niet. Controleer je internet en probeer het opnieuw.");
    }
    return null;
  }

  async function start() {
    setFase({ stap: "laden", wat: "De AI bedenkt een paar vragen voor je…" });
    const data = await vraag({ stap: "vragen" });
    const vragen = (data?.vragen as string[] | undefined) ?? [];
    if (!vragen.length) return setFase({ stap: "dicht" });
    setAntwoorden(vragen.map(() => ""));
    setFase({ stap: "vragen", vragen });
  }

  async function herschrijf(vragen: string[]) {
    setFase({ stap: "laden", wat: "De AI herschrijft je tekst met jouw antwoorden…" });
    const data = await vraag({ stap: "herschrijf", antwoorden: vragen.map((v, i) => ({ vraag: v, antwoord: antwoorden[i] ?? "" })) });
    if (typeof data?.html === "string" && data.html) setFase({ stap: "voorstel", html: data.html, vragen });
    else setFase({ stap: "vragen", vragen });
  }

  if (fase.stap === "dicht") {
    return (
      <div className="mt-2">
        <button onClick={start} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100">
          ✨ Hulp van AI: vragen beantwoorden en tekst laten herschrijven
        </button>
        {fout && <p className="mt-1 text-xs text-rose-600">{fout}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-violet-900">✨ Hulp van AI</p>
        <button onClick={() => setFase({ stap: "dicht" })} className="text-xs text-violet-700 hover:underline">
          Sluiten
        </button>
      </div>

      {fase.stap === "laden" && <p className="mt-2 animate-pulse text-sm text-violet-800">{fase.wat}</p>}

      {fase.stap === "vragen" && (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-violet-800">Beantwoord de vragen in je eigen woorden. Kort is prima. Een vraag overslaan mag ook.</p>
          {fase.vragen.map((v, i) => (
            <label key={i} className="block">
              <span className="text-sm font-medium text-slate-800">{v}</span>
              <textarea
                value={antwoorden[i] ?? ""}
                onChange={(e) => setAntwoorden((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-violet-200 bg-white p-2 text-sm outline-none focus:border-violet-500"
              />
            </label>
          ))}
          <button
            onClick={() => herschrijf(fase.vragen)}
            disabled={!antwoorden.some((a) => a.trim())}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-40"
          >
            Herschrijf mijn tekst
          </button>
        </div>
      )}

      {fase.stap === "voorstel" && (
        <div className="mt-2">
          <p className="text-xs text-violet-800">
            Voorstel van de AI. Lees het goed: klopt alles, en is het nog jouw verhaal? Pas het daarna aan in je eigen woorden.
          </p>
          <div className="verslag-tekst mt-2 rounded-lg border border-violet-200 bg-white p-3 text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: fase.html }} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => {
                onGebruik(fase.html);
                setFase({ stap: "dicht" });
              }}
              className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
            >
              Gebruik deze tekst
            </button>
            <button onClick={() => setFase({ stap: "vragen", vragen: fase.vragen })} className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100">
              Terug naar de vragen
            </button>
            <button onClick={() => setFase({ stap: "dicht" })} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Houd mijn eigen tekst
            </button>
          </div>
        </div>
      )}

      {fout && <p className="mt-2 text-xs text-rose-600">{fout}</p>}
    </div>
  );
}
