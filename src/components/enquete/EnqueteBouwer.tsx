"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Survey, SurveyQuestion, QuestionType, SurveyStatus } from "@/lib/types";

const TYPE_LABEL: Record<QuestionType, string> = {
  open: "Open vraag",
  meerkeuze: "Meerkeuze",
  schaal: "Schaal (1–5)",
  janee: "Ja / Nee",
};

type Tab = "vragen" | "delen" | "resultaten";

type Stats = {
  total: number;
  counts: { question_id: string; value: string; n: number }[];
  open: { question_id: string; value: string }[];
};

export default function EnqueteBouwer({
  survey,
  initialQuestions,
  stats,
  phases,
}: {
  survey: Survey;
  initialQuestions: SurveyQuestion[];
  stats: Stats;
  phases: { id: string; order_index: number; title: string }[];
}) {
  const responseCount = stats.total;
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("vragen");
  const [title, setTitle] = useState(survey.title);
  const [intro, setIntro] = useState(survey.intro ?? "");
  const [status, setStatus] = useState<SurveyStatus>(survey.status);
  const [phaseId, setPhaseId] = useState(survey.phase_id ?? "");
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions);
  const [copied, setCopied] = useState(false);

  async function saveSurvey(patch: Partial<Survey>) {
    await supabase.from("pws_surveys").update(patch).eq("id", survey.id);
  }

  async function addQuestion(type: QuestionType) {
    const q = {
      survey_id: survey.id,
      text: "",
      type,
      options: type === "meerkeuze" ? ["Optie 1", "Optie 2"] : [],
      required: false,
      order_index: questions.length,
    };
    const { data } = await supabase.from("pws_survey_questions").insert(q).select().single();
    if (data) setQuestions((qs) => [...qs, data as SurveyQuestion]);
  }

  function patchLocal(id: string, patch: Partial<SurveyQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  async function saveQuestion(id: string, patch: Partial<SurveyQuestion>) {
    await supabase.from("pws_survey_questions").update(patch).eq("id", id);
  }
  async function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    await supabase.from("pws_survey_questions").delete().eq("id", id);
  }
  async function move(id: string, dir: -1 | 1) {
    const idx = questions.findIndex((q) => q.id === id);
    const j = idx + dir;
    if (j < 0 || j >= questions.length) return;
    const a = questions[idx];
    const b = questions[j];
    const next = [...questions];
    next[idx] = b;
    next[j] = a;
    setQuestions(next);
    await Promise.all([
      supabase.from("pws_survey_questions").update({ order_index: j }).eq("id", a.id),
      supabase.from("pws_survey_questions").update({ order_index: idx }).eq("id", b.id),
    ]);
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/enquete/${survey.share_token}` : "";

  const countsByQ = useMemo(() => {
    const m: Record<string, { value: string; n: number }[]> = {};
    for (const c of stats.counts) (m[c.question_id] ??= []).push({ value: c.value, n: c.n });
    return m;
  }, [stats]);
  const openByQ = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const o of stats.open) (m[o.question_id] ??= []).push(o.value);
    return m;
  }, [stats]);

  function exportCsv() {
    const rows: string[][] = [["Vraag", "Antwoord", "Aantal"]];
    for (const q of questions) {
      if (q.type === "open") {
        for (const v of openByQ[q.id] ?? []) rows.push([q.text, v, "1"]);
      } else {
        for (const c of countsByQ[q.id] ?? []) rows.push([q.text, c.value, String(c.n)]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquete-${survey.title.replace(/[^\w]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => saveSurvey({ title: title.trim() || "Naamloze enquête" })}
        className="w-full rounded-lg border border-transparent bg-transparent text-2xl font-bold text-slate-900 outline-none hover:border-slate-200 focus:border-emerald-500"
      />

      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
        <span>Hoort bij fase:</span>
        <select
          value={phaseId}
          onChange={(e) => { setPhaseId(e.target.value); saveSurvey({ phase_id: e.target.value || null }); }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">— geen —</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>{p.order_index}. {p.title}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {(["vragen", "delen", "resultaten"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              tab === t ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {t === "resultaten" ? `Resultaten (${responseCount})` : t}
          </button>
        ))}
      </div>

      {/* VRAGEN */}
      {tab === "vragen" && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Introtekst (optioneel)</label>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              onBlur={() => saveSurvey({ intro: intro.trim() || null })}
              rows={2}
              placeholder="Korte uitleg voor de invuller: waar gaat de enquête over, hoe lang duurt het, anoniem?"
              className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-sm font-semibold text-slate-400">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <input
                    value={q.text}
                    onChange={(e) => patchLocal(q.id, { text: e.target.value })}
                    onBlur={() => saveQuestion(q.id, { text: q.text })}
                    placeholder="Je vraag…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const type = e.target.value as QuestionType;
                        const options = type === "meerkeuze" ? (q.options.length ? q.options : ["Optie 1", "Optie 2"]) : [];
                        patchLocal(q.id, { type, options });
                        saveQuestion(q.id, { type, options });
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                    >
                      {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
                        <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => {
                          patchLocal(q.id, { required: e.target.checked });
                          saveQuestion(q.id, { required: e.target.checked });
                        }}
                      />
                      Verplicht
                    </label>
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => move(q.id, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Omhoog">▲</button>
                      <button onClick={() => move(q.id, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Omlaag">▼</button>
                      <button onClick={() => removeQuestion(q.id)} className="rounded p-1 text-slate-300 hover:text-red-500" aria-label="Verwijderen">✕</button>
                    </div>
                  </div>

                  {q.type === "meerkeuze" && (
                    <OptionsEditor
                      options={q.options}
                      onChange={(options) => {
                        patchLocal(q.id, { options });
                        saveQuestion(q.id, { options });
                      }}
                    />
                  )}
                  {q.type === "schaal" && (
                    <p className="mt-2 text-xs text-slate-400">Invullers kiezen een cijfer van 1 (helemaal oneens) tot 5 (helemaal eens).</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
            <span className="w-full text-sm font-medium text-slate-600">Vraag toevoegen:</span>
            {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
              <button key={t} onClick={() => addQuestion(t)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-emerald-400 hover:text-emerald-600">
                + {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DELEN */}
      {tab === "delen" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-800">Status</p>
            <p className="mb-2 text-xs text-slate-400">Alleen een <strong>open</strong> enquête verzamelt antwoorden.</p>
            <div className="inline-flex rounded-lg border border-slate-200 p-1">
              {(["concept", "open", "gesloten"] as SurveyStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); saveSurvey({ status: s }); }}
                  className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition ${
                    status === s ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-800">Deel deze link</p>
            <p className="mb-2 text-xs text-slate-400">Iedereen met de link kan de enquête invullen (geen account nodig).</p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
              <button
                onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {copied ? "Gekopieerd ✓" : "Kopieer"}
              </button>
            </div>
            {status !== "open" && <p className="mt-2 text-xs text-amber-600">Zet de status op &quot;open&quot; om reacties te kunnen ontvangen.</p>}
          </div>
        </div>
      )}

      {/* RESULTATEN */}
      {tab === "resultaten" && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{responseCount} reactie{responseCount === 1 ? "" : "s"}</p>
            {responseCount > 0 && (
              <button onClick={exportCsv} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Download CSV
              </button>
            )}
          </div>
          {questions.length === 0 && <p className="text-sm text-slate-400">Nog geen vragen.</p>}
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-800">{i + 1}. {q.text || "(geen vraagtekst)"}</p>
              <div className="mt-2">
                <ResultView question={q} counts={countsByQ[q.id] ?? []} openValues={openByQ[q.id] ?? []} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  return (
    <div className="mt-2 space-y-1.5">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-slate-300">○</span>
          <input
            value={opt}
            onChange={(e) => onChange(options.map((o, j) => (j === i ? e.target.value : o)))}
            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
          {options.length > 1 && (
            <button onClick={() => onChange(options.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500">✕</button>
          )}
        </div>
      ))}
      <button onClick={() => onChange([...options, `Optie ${options.length + 1}`])} className="text-xs font-medium text-emerald-600 hover:underline">
        + optie toevoegen
      </button>
    </div>
  );
}

function ResultView({
  question,
  counts,
  openValues,
}: {
  question: SurveyQuestion;
  counts: { value: string; n: number }[];
  openValues: string[];
}) {
  if (question.type === "open") {
    if (openValues.length === 0) return <p className="text-sm text-slate-400">Nog geen antwoorden.</p>;
    return (
      <ul className="space-y-1">
        {openValues.map((v, i) => (
          <li key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{v}</li>
        ))}
      </ul>
    );
  }

  const total = counts.reduce((s, c) => s + c.n, 0);
  if (total === 0) return <p className="text-sm text-slate-400">Nog geen antwoorden.</p>;

  let buckets: string[];
  if (question.type === "meerkeuze") buckets = question.options;
  else if (question.type === "janee") buckets = ["Ja", "Nee"];
  else buckets = ["1", "2", "3", "4", "5"];

  const countOf = (b: string) => counts.find((c) => c.value === b)?.n ?? 0;
  const gemiddelde =
    question.type === "schaal"
      ? (counts.reduce((s, c) => s + (parseInt(c.value, 10) || 0) * c.n, 0) / total).toFixed(1)
      : null;

  return (
    <div className="space-y-1.5">
      {gemiddelde && <p className="text-xs text-slate-500">Gemiddelde: {gemiddelde}</p>}
      {buckets.map((b) => {
        const c = countOf(b);
        const pct = Math.round((c / total) * 100);
        return (
          <div key={b}>
            <div className="flex justify-between text-xs text-slate-600">
              <span>{b}</span>
              <span>{c} ({pct}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
