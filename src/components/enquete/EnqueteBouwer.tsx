"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STANDAARD_LABELS, labelsVoor, type Reactie } from "@/lib/enquete";
import type { Survey, SurveyQuestion, QuestionConfig, QuestionType, SurveyStatus } from "@/lib/types";
import EnqueteResultaten from "./EnqueteResultaten";

const TYPE_LABEL: Record<QuestionType, string> = {
  meerkeuze: "Eén antwoord",
  meerdere: "Meerdere antwoorden",
  schaal: "Schaal (1–5)",
  stellingen: "Stellingen (1–5)",
  janee: "Ja / Nee",
  open: "Open vraag",
};

const NIEUWE_CONFIG: Record<QuestionType, QuestionConfig> = {
  meerkeuze: {},
  meerdere: { max: 3 },
  schaal: { labels: STANDAARD_LABELS, weetNiet: true },
  stellingen: { labels: STANDAARD_LABELS, weetNiet: true, items: ["Stelling 1"] },
  janee: {},
  open: { maxLengte: 300 },
};

type Tab = "resultaten" | "delen" | "vragen";

export default function EnqueteBouwer({
  survey,
  initialQuestions,
  reacties,
  phases,
}: {
  survey: Survey;
  initialQuestions: SurveyQuestion[];
  reacties: Reactie[];
  phases: { id: string; order_index: number; title: string }[];
}) {
  const responseCount = reacties.length;
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(responseCount > 0 ? "resultaten" : "delen");
  const [title, setTitle] = useState(survey.title);
  const [intro, setIntro] = useState(survey.intro ?? "");
  const [afsluiting, setAfsluiting] = useState(survey.afsluiting ?? "");
  const [status, setStatus] = useState<SurveyStatus>(survey.status);
  const [phaseId, setPhaseId] = useState(survey.phase_id ?? "");
  const [slug, setSlug] = useState(survey.slug ?? "");
  const [vasteSlug, setVasteSlug] = useState(survey.slug);
  const [slugFout, setSlugFout] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialQuestions);
  const [copied, setCopied] = useState(false);

  async function saveSurvey(patch: Partial<Survey>) {
    return supabase.from("pws_surveys").update(patch).eq("id", survey.id);
  }

  async function saveSlug() {
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    setSlug(s);
    if (s === (vasteSlug ?? "")) return;
    const { error } = await saveSurvey({ slug: s || null });
    if (error) setSlugFout(error.code === "23505" ? "Deze korte link is al in gebruik." : "Opslaan lukte niet.");
    else {
      setSlugFout("");
      setVasteSlug(s || null);
    }
  }

  async function addQuestion(type: QuestionType) {
    const q = {
      survey_id: survey.id,
      text: "",
      type,
      options: type === "meerkeuze" || type === "meerdere" ? ["Optie 1", "Optie 2"] : [],
      required: type !== "open",
      order_index: questions.length,
      section: questions.at(-1)?.section ?? null,
      config: NIEUWE_CONFIG[type],
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
  function setConfig(q: SurveyQuestion, patch: Partial<QuestionConfig>) {
    const config = { ...q.config, ...patch };
    patchLocal(q.id, { config });
    saveQuestion(q.id, { config });
  }
  async function removeQuestion(id: string) {
    if (!confirm("Deze vraag verwijderen? Antwoorden op deze vraag worden ook verwijderd.")) return;
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

  async function reactiesWissen() {
    if (!confirm(`Alle ${responseCount} reacties van deze enquête definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    await supabase.from("pws_survey_responses").delete().eq("survey_id", survey.id);
    router.refresh();
  }

  async function enqueteVerwijderen() {
    if (!confirm(`De enquête "${title}" met alle vragen en ${responseCount} reacties definitief verwijderen?`)) return;
    await supabase.from("pws_surveys").delete().eq("id", survey.id);
    router.push("/enquetes");
    router.refresh();
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}${vasteSlug ? `/e/${vasteSlug}` : `/enquete/${survey.share_token}`}`;
  const deelTekst = `Wil je mijn korte enquête voor mijn profielwerkstuk invullen? Het duurt maar een paar minuten en is anoniem. ${shareUrl}`;

  function kopieer(tekst: string) {
    navigator.clipboard.writeText(tekst);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        {(["resultaten", "delen", "vragen"] as Tab[]).map((t) => (
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

      {/* RESULTATEN */}
      {tab === "resultaten" && (
        <div className="mt-4">
          <EnqueteResultaten titel={title} vragen={questions} reacties={reacties} />
        </div>
      )}

      {/* DELEN */}
      {tab === "delen" && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-800">Deel deze link</p>
            <p className="mb-3 text-xs text-slate-500">Iedereen met de link kan de enquête invullen, ook op de telefoon. Geen account nodig.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700" />
              <button
                onClick={() => kopieer(shareUrl)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {copied ? "Gekopieerd ✓" : "Kopieer link"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(deelTekst)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Deel via WhatsApp
              </a>
              <button onClick={() => kopieer(deelTekst)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Kopieer link met uitnodiging
              </button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Bekijk als invuller ↗
              </a>
            </div>
            {status !== "open" && <p className="mt-3 text-xs text-amber-600">Zet de status op &quot;open&quot; om reacties te kunnen ontvangen.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-800">Korte link</p>
            <p className="mb-2 text-xs text-slate-500">Alleen kleine letters, cijfers en streepjes.</p>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-slate-500">{origin}/e/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={saveSlug}
                placeholder="bijv. leerlingen"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-emerald-500"
              />
            </div>
            {slugFout && <p className="mt-1 text-xs text-red-600">{slugFout}</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-800">Status</p>
            <p className="mb-2 text-xs text-slate-500">Alleen een <strong>open</strong> enquête verzamelt antwoorden.</p>
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

          <div className="rounded-2xl border border-red-100 bg-white p-4">
            <p className="text-sm font-medium text-slate-800">Opruimen</p>
            <p className="mb-2 text-xs text-slate-500">Zelf getest? Wis alle reacties voordat je de link echt deelt.</p>
            <div className="flex flex-wrap gap-2">
              {responseCount > 0 && (
                <button onClick={reactiesWissen} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                  Alle {responseCount} reacties wissen
                </button>
              )}
              <button onClick={enqueteVerwijderen} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                Enquête verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VRAGEN */}
      {tab === "vragen" && (
        <div className="mt-4 space-y-3">
          {responseCount > 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              Er zijn al {responseCount} reacties. Pas vragen en antwoordopties alleen aan als het echt nodig is, anders kloppen je resultaten niet meer.
            </p>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Introtekst</label>
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              onBlur={() => saveSurvey({ intro: intro.trim() || null })}
              rows={3}
              placeholder="Korte uitleg voor de invuller: waar gaat de enquête over, hoe lang duurt het, anoniem?"
              className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
            />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">Bedanktekst</label>
            <input
              value={afsluiting}
              onChange={(e) => setAfsluiting(e.target.value)}
              onBlur={() => saveSurvey({ afsluiting: afsluiting.trim() || null })}
              placeholder="Bedankt voor het invullen!"
              className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {questions.map((q, i) => {
            const afhankelijk = q.config.afhankelijkVan ? questions.findIndex((x) => x.id === q.config.afhankelijkVan) : -1;
            return (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-2 text-sm font-semibold text-slate-500">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={q.section ?? ""}
                      onChange={(e) => patchLocal(q.id, { section: e.target.value })}
                      onBlur={() => saveQuestion(q.id, { section: q.section?.trim() || null })}
                      placeholder="Onderdeel (optioneel)"
                      className="mb-1.5 w-full rounded-md border border-transparent px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 outline-none placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 hover:border-slate-200 focus:border-emerald-500"
                    />
                    <input
                      value={q.text}
                      onChange={(e) => patchLocal(q.id, { text: e.target.value })}
                      onBlur={() => saveQuestion(q.id, { text: q.text })}
                      placeholder="Je vraag…"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">{TYPE_LABEL[q.type]}</span>
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
                      {q.type === "meerdere" && (
                        <label className="flex items-center gap-1 text-xs text-slate-500">
                          Max.
                          <input
                            type="number"
                            min={0}
                            value={q.config.max ?? ""}
                            onChange={(e) => setConfig(q, { max: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-14 rounded border border-slate-200 px-1.5 py-0.5"
                          />
                        </label>
                      )}
                      {(q.type === "schaal" || q.type === "stellingen") && (
                        <label className="flex items-center gap-1 text-xs text-slate-500">
                          <input type="checkbox" checked={!!q.config.weetNiet} onChange={(e) => setConfig(q, { weetNiet: e.target.checked })} />
                          &quot;Weet ik niet&quot;
                        </label>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => move(q.id, -1)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Omhoog">▲</button>
                        <button onClick={() => move(q.id, 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Omlaag">▼</button>
                        <button onClick={() => removeQuestion(q.id)} className="rounded p-1 text-slate-300 hover:text-red-500" aria-label="Verwijderen">✕</button>
                      </div>
                    </div>

                    {q.config.toonAls && (
                      <p className="mt-2 text-xs text-slate-500">
                        Alleen getoond als vraag {questions.findIndex((x) => x.id === q.config.toonAls!.vraag) + 1} is:{" "}
                        <strong>{q.config.toonAls.waarden.join(" / ")}</strong>
                      </p>
                    )}
                    {(q.type === "meerkeuze" || q.type === "meerdere") && !q.config.groepen?.length && (
                      <OptionsEditor
                        options={q.options}
                        onChange={(options) => {
                          patchLocal(q.id, { options });
                          saveQuestion(q.id, { options });
                        }}
                      />
                    )}
                    {q.type === "meerkeuze" && !!q.config.groepen?.length && (
                      <div className="mt-2 space-y-3">
                        {q.config.groepen.map((g, gi) => (
                          <div key={gi} className="rounded-lg bg-slate-50 p-2">
                            <p className="text-xs text-slate-500">
                              Als vraag {afhankelijk + 1} is: <strong>{g.als.join(" / ")}</strong>
                            </p>
                            <OptionsEditor
                              options={g.opties}
                              onChange={(opties) =>
                                setConfig(q, { groepen: q.config.groepen!.map((x, xi) => (xi === gi ? { ...x, opties } : x)) })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === "stellingen" && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-slate-500">Stellingen</p>
                        <OptionsEditor
                          options={q.config.items ?? []}
                          nieuw="Nieuwe stelling"
                          onChange={(items) => setConfig(q, { items })}
                        />
                      </div>
                    )}
                    {(q.type === "schaal" || q.type === "stellingen") && (
                      <div className="mt-2 grid grid-cols-5 gap-1">
                        {labelsVoor(q).map((l, li) => (
                          <input
                            key={li}
                            defaultValue={l}
                            aria-label={`Label ${li + 1}`}
                            onBlur={(e) => {
                              const labels = [...labelsVoor(q)];
                              labels[li] = e.target.value.trim() || labels[li];
                              setConfig(q, { labels });
                            }}
                            className="min-w-0 rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-emerald-500"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

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
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
  nieuw = "Optie",
}: {
  options: string[];
  onChange: (o: string[]) => void;
  nieuw?: string;
}) {
  const [lokaal, setLokaal] = useState(options);
  const opslaan = (o: string[]) => {
    setLokaal(o);
    onChange(o);
  };
  return (
    <div className="mt-2 space-y-1.5">
      {lokaal.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-slate-300">○</span>
          <input
            value={opt}
            onChange={(e) => setLokaal(lokaal.map((o, j) => (j === i ? e.target.value : o)))}
            onBlur={() => onChange(lokaal)}
            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
          {lokaal.length > 1 && (
            <button onClick={() => opslaan(lokaal.filter((_, j) => j !== i))} aria-label="Verwijderen" className="text-slate-300 hover:text-red-500">✕</button>
          )}
        </div>
      ))}
      <button onClick={() => opslaan([...lokaal, `${nieuw} ${lokaal.length + 1}`])} className="text-xs font-medium text-emerald-600 hover:underline">
        + toevoegen
      </button>
    </div>
  );
}
