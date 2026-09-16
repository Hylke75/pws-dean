"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QuestionType } from "@/lib/types";

type PublicQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  required: boolean;
};
type PublicSurvey = { title: string; intro: string | null; questions: PublicQuestion[] };

export default function EnqueteInvullen({ token }: { token: string }) {
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [state, setState] = useState<"laden" | "klaar" | "dicht" | "verstuurd">("laden");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(`pws_enq_${token}`)) {
      setState("verstuurd");
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("pws_enquete_public", { p_token: token });
      if (data) {
        setSurvey(data as PublicSurvey);
        setState("klaar");
      } else {
        setState("dicht");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function set(qid: string, value: string) {
    setValues((v) => ({ ...v, [qid]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey) return;
    for (const q of survey.questions) {
      if (q.required && !(values[q.id] ?? "").trim()) {
        setErr("Beantwoord alle verplichte vragen (met een *).");
        return;
      }
    }
    setErr("");
    setBusy(true);
    const answers = survey.questions
      .filter((q) => (values[q.id] ?? "").trim())
      .map((q) => ({ question_id: q.id, value: values[q.id] }));
    const { data } = await supabase.rpc("pws_enquete_indienen", { p_token: token, p_answers: answers });
    setBusy(false);
    if (data?.ok) {
      if (typeof window !== "undefined") localStorage.setItem(`pws_enq_${token}`, "1");
      setState("verstuurd");
    } else setErr("Versturen mislukt. De enquête is misschien gesloten.");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        {state === "laden" && <p className="text-center text-slate-400">Laden…</p>}

        {state === "dicht" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-3xl">🔒</p>
            <p className="mt-2 font-medium text-slate-800">Deze enquête is (nog) niet beschikbaar.</p>
            <p className="mt-1 text-sm text-slate-500">Vraag de maker om een geldige, geopende link.</p>
          </div>
        )}

        {state === "verstuurd" && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center">
            <p className="text-3xl">✅</p>
            <p className="mt-2 font-medium text-slate-800">Bedankt voor het invullen!</p>
            <p className="mt-1 text-sm text-slate-500">Je antwoorden zijn opgeslagen.</p>
          </div>
        )}

        {state === "klaar" && survey && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{survey.title}</h1>
              {survey.intro && <p className="mt-1 text-slate-600">{survey.intro}</p>}
            </div>

            {survey.questions.map((q, i) => (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-800">
                  {i + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}
                </p>
                <div className="mt-2">
                  {q.type === "open" && (
                    <textarea
                      value={values[q.id] ?? ""}
                      onChange={(e) => set(q.id, e.target.value)}
                      rows={3}
                      className="w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  )}
                  {q.type === "meerkeuze" && (
                    <div className="space-y-1.5">
                      {q.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="radio" name={q.id} checked={values[q.id] === opt} onChange={() => set(q.id, opt)} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === "janee" && (
                    <div className="flex gap-4">
                      {["Ja", "Nee"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="radio" name={q.id} checked={values[q.id] === opt} onChange={() => set(q.id, opt)} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === "schaal" && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">oneens</span>
                      {["1", "2", "3", "4", "5"].map((n) => (
                        <label key={n} className="flex flex-col items-center text-xs text-slate-600">
                          <input type="radio" name={q.id} checked={values[q.id] === n} onChange={() => set(q.id, n)} />
                          {n}
                        </label>
                      ))}
                      <span className="text-xs text-slate-400">eens</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {err && <p className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? "Versturen…" : "Versturen"}
            </button>
            <p className="text-center text-xs text-slate-400">Je antwoorden worden anoniem opgeslagen.</p>
          </form>
        )}
      </div>
    </main>
  );
}
