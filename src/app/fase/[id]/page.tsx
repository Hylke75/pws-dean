import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { fmtRange, fmtDate, humanUntil, isPast } from "@/lib/dates";
import StatusSelect from "@/components/phase/StatusSelect";
import Notes from "@/components/phase/Notes";
import FaseVelden from "@/components/phase/FaseVelden";
import FaseHulp from "@/components/phase/FaseHulp";
import { veldenVoorFase, hulpVoorFase } from "@/lib/faseVelden";
import Checklist from "@/components/phase/Checklist";
import Attachments from "@/components/phase/Attachments";
import CriteriaChecklist from "@/components/phase/CriteriaChecklist";
import ToetsPaneel from "@/components/phase/ToetsPaneel";
import IndienenReview from "@/components/phase/IndienenReview";
import { REVIEW_STATUS_LABELS } from "@/lib/types";
import type {
  Phase,
  ChecklistItem,
  Attachment,
  Source,
  DeadlineChange,
  ToetsCriterium,
  AiFeedback,
  Review,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const REVIEW_BADGE: Record<string, string> = {
  concept: "bg-slate-100 text-slate-600",
  ingediend: "bg-sky-100 text-sky-700",
  goedgekeurd: "bg-emerald-100 text-emerald-700",
  wijzigingen_nodig: "bg-amber-100 text-amber-700",
};

export default async function PhasePage({ params }: PageProps<"/fase/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { profile } = await getSession();
  const isReviewer = profile?.role !== "student";

  const { data: phase } = await supabase.from("pws_phases").select("*").eq("id", id).single();
  if (!phase) notFound();
  const p = phase as Phase;
  const velden = veldenVoorFase(p.order_index);
  const hulp = hulpVoorFase(p.order_index);

  const [
    { data: checklist },
    { data: attachments },
    { data: sources },
    { data: changes },
    { data: criteria },
    { data: aiFeedback },
    { data: reviews },
    { data: surveys },
  ] = await Promise.all([
    supabase.from("pws_checklist_items").select("*").eq("phase_id", id).order("order_index"),
    supabase.from("pws_attachments").select("*").eq("phase_id", id).order("created_at"),
    supabase.from("pws_sources").select("*").eq("phase_id", id).order("created_at"),
    supabase.from("pws_deadline_changes").select("*").eq("phase_id", id).order("created_at", { ascending: false }),
    supabase.from("pws_toets_criteria").select("*").eq("phase_id", id).order("order_index"),
    supabase.from("pws_ai_feedback").select("*").eq("phase_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("pws_reviews").select("*").eq("phase_id", id).order("created_at", { ascending: false }),
    supabase.from("pws_surveys").select("id, title, status").eq("phase_id", id).order("created_at"),
  ]);
  const gekoppeldeEnquetes = (surveys as { id: string; title: string; status: string }[]) ?? [];

  const laatsteFeedback = aiFeedback as AiFeedback | null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← Terug naar overzicht
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {p.is_milestone ? "Mijlpaal" : `Fase ${p.order_index}`}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{p.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-500">{fmtRange(p.start_date, p.deadline)}</p>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${REVIEW_BADGE[p.review_status]}`}>
              {REVIEW_STATUS_LABELS[p.review_status]}
            </span>
          </div>
        </div>
        <StatusSelect phaseId={p.id} status={p.status} />
      </div>

      {p.deadline && p.status !== "klaar" && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
            isPast(p.deadline) ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          Deadline: {fmtDate(p.deadline)} — {humanUntil(p.deadline)}
        </div>
      )}

      {p.description && (
        <p className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
          {p.description}
        </p>
      )}

      {hulp && (
        <div className="mt-4">
          <FaseHulp hulp={hulp} defaultOpen={p.order_index <= 5} />
        </div>
      )}

      {velden.length > 0 && (
        <Section title="Jouw uitwerking" hint="Vul hier het echte werk voor deze fase in.">
          <FaseVelden phaseId={p.id} velden={velden} initial={p.veld_data ?? {}} />
        </Section>
      )}

      <Section
        title={velden.length > 0 ? "Extra aantekeningen" : "Jouw uitwerking"}
        hint={velden.length > 0 ? "Losse gedachten of aanvullingen." : "Vul hier het echte werk voor deze fase in."}
      >
        <Notes phaseId={p.id} initial={p.notes ?? ""} />
      </Section>

      <Section title="Materiaal & bijlagen" hint="Plak links of upload bestanden (documenten, foto's, data).">
        <Attachments phaseId={p.id} initial={(attachments as Attachment[]) ?? []} />
      </Section>

      {gekoppeldeEnquetes.length > 0 && (
        <Section title="Enquêtes bij deze fase">
          <ul className="space-y-1.5">
            {gekoppeldeEnquetes.map((s) => (
              <li key={s.id}>
                <Link href={`/enquetes/${s.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
                  <span className="font-medium text-slate-800">📋 {s.title}</span>
                  <span className="text-xs text-slate-500">{s.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Check met AI" hint="Laat je uitwerking direct nakijken aan de eisen van deze fase.">
        <ToetsPaneel
          phaseId={p.id}
          initial={laatsteFeedback?.data ?? null}
          initialAt={laatsteFeedback?.created_at ?? null}
        />
      </Section>

      <Section title="Eisen afvinken" hint="Vink zelf af wat je hebt gedaan — zo zie je of de fase compleet is.">
        <CriteriaChecklist initial={(criteria as ToetsCriterium[]) ?? []} />
      </Section>

      <Section title="Nakijken & feedback" hint="Dien in bij je ouders en ontvang gerichte feedback.">
        <IndienenReview
          phaseId={p.id}
          reviewStatus={p.review_status}
          isReviewer={isReviewer}
          reviews={(reviews as Review[]) ?? []}
        />
      </Section>

      <Section title="Eigen taken" hint="Losse to-do's die je zelf toevoegt.">
        <Checklist phaseId={p.id} initial={(checklist as ChecklistItem[]) ?? []} suggesties={hulp?.aanpak ?? []} />
      </Section>

      {sources && (sources as Source[]).length > 0 && (
        <Section title="Bronnen bij deze fase">
          <ul className="space-y-1.5">
            {(sources as Source[]).map((s) => (
              <li key={s.id} className="text-sm text-slate-700">
                <span className="font-medium">{s.title}</span>
                {s.authors ? ` — ${s.authors}` : ""}
                {s.url && (
                  <>
                    {" "}
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
                      link
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
          <Link href="/bronnen" className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:underline">
            Alle bronnen beheren →
          </Link>
        </Section>
      )}

      {changes && (changes as DeadlineChange[]).length > 0 && (
        <Section title="Wijzigingsgeschiedenis">
          <ul className="space-y-1.5">
            {(changes as DeadlineChange[]).map((c) => (
              <li key={c.id} className="text-sm text-slate-500">
                <span className="text-slate-500">{fmtDate(c.created_at.slice(0, 10))}:</span>{" "}
                {c.field === "deadline" ? "Deadline" : c.field === "start_date" ? "Startdatum" : c.field}{" "}
                {c.old_value ?? "—"} → <span className="font-medium text-slate-700">{c.new_value ?? "—"}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {hint && <p className="mb-2 mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className={`${hint ? "" : "mt-2"} rounded-2xl border border-slate-200 bg-white p-4`}>{children}</div>
    </section>
  );
}
