import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import AdminPlanningRow from "@/components/AdminPlanningRow";
import { fmtDate } from "@/lib/dates";
import type { Phase, DeadlineChange } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { profile } = await getSession();
  if (!profile || profile.role === "student") redirect("/");

  const supabase = await createClient();
  const [{ data: phases }, { data: changes }] = await Promise.all([
    supabase.from("pws_phases").select("*").order("order_index"),
    supabase
      .from("pws_deadline_changes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const phaseTitle = (id: string) => (phases as Phase[])?.find((p) => p.id === id)?.title ?? "?";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Planning beheren</h1>
      <p className="mt-1 text-slate-500">
        Pas start- of deadlinedatums aan. Bij elke wijziging krijgt de leerling automatisch een
        melding én een e-mail.
      </p>

      <div className="mt-6 space-y-2">
        {(phases as Phase[])?.map((p) => (
          <AdminPlanningRow key={p.id} phase={p} />
        ))}
      </div>

      {changes && (changes as DeadlineChange[]).length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recente wijzigingen
          </h2>
          <ul className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4">
            {(changes as DeadlineChange[]).map((c) => (
              <li key={c.id} className="text-sm text-slate-500">
                <span className="text-slate-500">{fmtDate(c.created_at.slice(0, 10))}</span>{" "}
                — <Link href={`/fase/${c.phase_id}`} className="font-medium text-slate-700 hover:underline">{phaseTitle(c.phase_id)}</Link>:{" "}
                {c.field === "deadline" ? "deadline" : c.field === "start_date" ? "startdatum" : c.field}{" "}
                {c.old_value ?? "—"} → {c.new_value ?? "—"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
