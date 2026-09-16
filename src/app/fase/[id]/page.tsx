import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtRange, fmtDate, humanUntil, isPast } from "@/lib/dates";
import StatusSelect from "@/components/phase/StatusSelect";
import Notes from "@/components/phase/Notes";
import Checklist from "@/components/phase/Checklist";
import Attachments from "@/components/phase/Attachments";
import type { Phase, ChecklistItem, Attachment, Source, DeadlineChange } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PhasePage({ params }: PageProps<"/fase/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: phase } = await supabase.from("pws_phases").select("*").eq("id", id).single();
  if (!phase) notFound();
  const p = phase as Phase;

  const [{ data: checklist }, { data: attachments }, { data: sources }, { data: changes }] =
    await Promise.all([
      supabase.from("pws_checklist_items").select("*").eq("phase_id", id).order("order_index"),
      supabase.from("pws_attachments").select("*").eq("phase_id", id).order("created_at"),
      supabase.from("pws_sources").select("*").eq("phase_id", id).order("created_at"),
      supabase
        .from("pws_deadline_changes")
        .select("*")
        .eq("phase_id", id)
        .order("created_at", { ascending: false }),
    ]);

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
          <p className="mt-1 text-sm text-slate-500">{fmtRange(p.start_date, p.deadline)}</p>
        </div>
        <StatusSelect phaseId={p.id} status={p.status} />
      </div>

      {/* Deadline-banner */}
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

      <Section title="Notities">
        <Notes phaseId={p.id} initial={p.notes ?? ""} />
      </Section>

      <Section title="Checklist">
        <Checklist phaseId={p.id} initial={(checklist as ChecklistItem[]) ?? []} />
      </Section>

      <Section title="Bijlagen & links">
        <Attachments phaseId={p.id} initial={(attachments as Attachment[]) ?? []} />
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
                <span className="text-slate-400">{fmtDate(c.created_at.slice(0, 10))}:</span>{" "}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">{children}</div>
    </section>
  );
}
