import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import StatusPill from "@/components/StatusPill";
import { fmtRange, fmtDate, daysUntil, humanUntil, isPast } from "@/lib/dates";
import type { Phase } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { profile } = await getSession();

  const { data: phasesData } = await supabase
    .from("pws_phases")
    .select("*")
    .order("order_index", { ascending: true });
  const phases = (phasesData as Phase[]) ?? [];

  const { data: logs } = await supabase.from("pws_logboek").select("minutes");
  const totalMinutes = (logs ?? []).reduce((s, l) => s + (l.minutes ?? 0), 0);
  const totalHours = totalMinutes / 60;

  const done = phases.filter((p) => p.status === "klaar").length;
  const pct = phases.length ? Math.round((done / phases.length) * 100) : 0;

  // Eerstvolgende deadline: fase die niet klaar is, met de vroegste deadline.
  const upcoming = phases
    .filter((p) => p.status !== "klaar" && p.deadline)
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
  const next = upcoming[0];

  const firstName = profile?.full_name?.split(" ")[0] ?? "daar";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Hoi {firstName} 👋</h1>
      <p className="mt-1 text-slate-500">Zo staat je profielwerkstuk ervoor.</p>

      {/* Kaarten */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Voortgang</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{pct}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">{done} van {phases.length} fases klaar</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Logboek</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {totalHours.toFixed(1)}<span className="text-lg text-slate-400"> / 80 u</span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, (totalHours / 80) * 100)}%` }} />
          </div>
          <Link href="/logboek" className="mt-2 inline-block text-xs font-medium text-sky-600 hover:underline">
            Uren toevoegen →
          </Link>
        </div>

        <div className={`rounded-2xl border p-5 ${next && isPast(next.deadline) ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
          <p className="text-sm text-slate-500">Eerstvolgende deadline</p>
          {next ? (
            <>
              <p className="mt-1 text-lg font-bold text-slate-900">{next.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{fmtDate(next.deadline)}</p>
              <p className={`mt-2 text-sm font-semibold ${isPast(next.deadline) ? "text-red-600" : "text-emerald-600"}`}>
                {humanUntil(next.deadline)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-lg font-bold text-emerald-600">Alles klaar 🎉</p>
          )}
        </div>
      </div>

      {/* Tijdlijn */}
      <h2 className="mt-10 text-lg font-semibold text-slate-900">Planning</h2>
      <ol className="mt-4 space-y-2">
        {phases.map((p) => {
          const d = daysUntil(p.deadline);
          const overdue = p.status !== "klaar" && d !== null && d < 0;
          const soon = p.status !== "klaar" && d !== null && d >= 0 && d <= 7;
          return (
            <li key={p.id}>
              <Link
                href={`/fase/${p.id}`}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                  {p.is_milestone ? "★" : p.order_index}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-400">{fmtRange(p.start_date, p.deadline)}</p>
                </div>
                {overdue && <span className="hidden text-xs font-semibold text-red-600 sm:block">te laat</span>}
                {soon && !overdue && <span className="hidden text-xs font-semibold text-amber-600 sm:block">{humanUntil(p.deadline)}</span>}
                {p.review_status === "ingediend" && (
                  <span className="hidden rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 sm:inline">ingediend</span>
                )}
                {p.review_status === "goedgekeurd" && (
                  <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 sm:inline">✓ akkoord</span>
                )}
                {p.review_status === "wijzigingen_nodig" && (
                  <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 sm:inline">wijzigen</span>
                )}
                <StatusPill status={p.status} />
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
