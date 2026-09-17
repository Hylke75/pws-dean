import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import StatusPill from "@/components/StatusPill";
import WelkomKaart from "@/components/WelkomKaart";
import { fmtRange, fmtDate, daysUntil, humanUntil, isPast, parseDate } from "@/lib/dates";
import { hulpVoorFase } from "@/lib/faseVelden";
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

  const { data: logs } = await supabase
    .from("pws_logboek")
    .select("minutes, next_step, created_at")
    .order("created_at", { ascending: false });
  const totalMinutes = (logs ?? []).reduce((s, l) => s + (l.minutes ?? 0), 0);
  const totalHours = totalMinutes / 60;
  const laatsteStap = (logs ?? []).find((l) => (l.next_step ?? "").trim())?.next_step ?? null;

  const done = phases.filter((p) => p.status === "klaar").length;
  const pct = phases.length ? Math.round((done / phases.length) * 100) : 0;

  const upcoming = phases
    .filter((p) => p.status !== "klaar" && p.deadline)
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
  const next = upcoming[0];

  // Huidige fase: waar vandaag binnen valt (en niet klaar), anders de eerstvolgende.
  const lopend = phases.filter((p) => {
    if (p.status === "klaar") return false;
    const ds = daysUntil(p.start_date);
    const dd = daysUntil(p.deadline);
    return ds !== null && dd !== null && ds <= 0 && dd >= 0;
  });
  const huidige = lopend[0] ?? next ?? null;
  const huidigeHulp = huidige ? hulpVoorFase(huidige.order_index) : null;
  const eersteStap = huidigeHulp?.aanpak?.[0];

  // Uren-tempo: verwacht t.o.v. de looptijd (richtlijn 80 u).
  const startAll = parseDate(phases[0]?.start_date ?? null);
  const eindAll = parseDate(phases[phases.length - 1]?.deadline ?? null);
  let verwachtUur: number | null = null;
  if (startAll && eindAll) {
    const totaal = (eindAll.getTime() - startAll.getTime()) / 86400000;
    const verstreken = Math.max(0, Math.min(totaal, (Date.now() - startAll.getTime()) / 86400000));
    if (totaal > 0) verwachtUur = Math.round((80 * verstreken) / totaal);
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "daar";
  const isReviewer = profile?.role !== "student";
  const teBeoordelen = phases.filter((p) => p.review_status === "ingediend");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Hoi {firstName} 👋</h1>
      <p className="mt-1 text-slate-500">
        {isReviewer ? "Zo staat Deans profielwerkstuk ervoor." : "Zo staat je profielwerkstuk ervoor."}
      </p>

      {profile && <WelkomKaart role={profile.role} />}

      {isReviewer && teBeoordelen.length > 0 && (
        <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-semibold text-sky-800">Te beoordelen ({teBeoordelen.length})</p>
          <ul className="mt-2 space-y-1.5">
            {teBeoordelen.map((p) => (
              <li key={p.id}>
                <Link href={`/fase/${p.id}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-slate-50">
                  <span className="font-medium text-slate-800">Fase {p.order_index}: {p.title}</span>
                  <span className="text-xs text-sky-600">Bekijk &amp; geef feedback →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Focus: waar je nu mee bezig bent */}
      {huidige && (
        <Link
          href={`/fase/${huidige.id}`}
          className={`mt-6 block rounded-2xl border p-5 transition hover:shadow-sm ${
            isPast(huidige.deadline) ? "border-red-200 bg-red-50 hover:border-red-300" : "border-emerald-200 bg-emerald-50 hover:border-emerald-300"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {isReviewer ? "Dean werkt nu aan" : "Waar je nu mee bezig bent"}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-lg font-bold text-slate-900">Fase {huidige.order_index}: {huidige.title}</p>
            <span className={`text-sm font-semibold ${isPast(huidige.deadline) ? "text-red-600" : "text-emerald-700"}`}>
              deadline {fmtDate(huidige.deadline)} · {humanUntil(huidige.deadline)}
            </span>
          </div>
          {eersteStap && <p className="mt-2 text-sm text-slate-700">👉 Eerste stap: {eersteStap}</p>}
          {laatsteStap && !isReviewer && (
            <p className="mt-1 text-xs text-slate-500">Jouw laatste volgende stap: {laatsteStap}</p>
          )}
        </Link>
      )}

      {/* Kaarten */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
          {verwachtUur != null && done < phases.length ? (
            <p className={`mt-2 text-xs ${totalHours + 2 < verwachtUur ? "text-amber-600" : "text-slate-400"}`}>
              Op schema is nu ± {verwachtUur} u
            </p>
          ) : (
            <Link href="/logboek" className="mt-2 inline-block text-xs font-medium text-sky-600 hover:underline">Uren toevoegen →</Link>
          )}
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
          const isHuidig = huidige?.id === p.id;
          return (
            <li key={p.id}>
              <Link
                href={`/fase/${p.id}`}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition hover:shadow-sm ${
                  isHuidig ? "border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:border-emerald-300"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isHuidig ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {p.is_milestone ? "★" : p.order_index}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{p.title}</p>
                  <p className="text-xs text-slate-400">{fmtRange(p.start_date, p.deadline)}</p>
                </div>
                {isHuidig && <span className="hidden rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white sm:inline">nu</span>}
                {overdue && <span className="hidden text-xs font-semibold text-red-600 sm:block">te laat</span>}
                {soon && !overdue && !isHuidig && <span className="hidden text-xs font-semibold text-amber-600 sm:block">{humanUntil(p.deadline)}</span>}
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
