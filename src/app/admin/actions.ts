"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendMail, shell } from "@/lib/email";
import { fmtDate } from "@/lib/dates";

type Recipient = { email: string | null; full_name: string | null; phase_title: string };

const FIELD_LABELS: Record<string, string> = {
  deadline: "Deadline",
  start_date: "Startdatum",
  title: "Titel",
};

type PlanningResult = { ok: boolean; error?: string; changed?: number; mailed?: number };

export async function updatePlanning(formData: FormData): Promise<PlanningResult> {
  const phaseId = String(formData.get("phase_id"));
  const title = String(formData.get("title") ?? "").trim();
  const startDate = (String(formData.get("start_date") ?? "").trim() || null) as string | null;
  const deadline = (String(formData.get("deadline") ?? "").trim() || null) as string | null;

  const supabase = await createClient();

  // Alleen begeleiders mogen de planning wijzigen.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const { data: me } = await supabase.from("pws_profiles").select("role").eq("id", user.id).single();
  if (!me || me.role === "student") return { ok: false, error: "Geen rechten" };

  const { data: current } = await supabase
    .from("pws_phases")
    .select("title, start_date, deadline")
    .eq("id", phaseId)
    .single();
  if (!current) return { ok: false, error: "Fase niet gevonden" };

  const changes: { field: string; old: string | null; new: string | null }[] = [];
  if (title && title !== current.title) changes.push({ field: "title", old: current.title, new: title });
  if (startDate !== current.start_date) changes.push({ field: "start_date", old: current.start_date, new: startDate });
  if (deadline !== current.deadline) changes.push({ field: "deadline", old: current.deadline, new: deadline });

  if (changes.length === 0) return { ok: true, changed: 0 };

  const { error: updErr } = await supabase
    .from("pws_phases")
    .update({ title: title || current.title, start_date: startDate, deadline })
    .eq("id", phaseId);
  if (updErr) return { ok: false, error: updErr.message };

  // Per wijziging: loggen + studenten notificeren (via security-definer RPC) + mail.
  const recipients = new Map<string, Recipient>();
  for (const c of changes) {
    const isDate = c.field === "deadline" || c.field === "start_date";
    const oldVal = isDate ? c.old : c.old;
    const newVal = isDate ? c.new : c.new;
    const { data } = await supabase.rpc("pws_notify_change", {
      p_phase_id: phaseId,
      p_field: c.field,
      p_old: isDate ? (c.old ? fmtDate(c.old) : null) : oldVal,
      p_new: isDate ? (c.new ? fmtDate(c.new) : null) : newVal,
    });
    for (const r of (data as Recipient[]) ?? []) {
      if (r.email) recipients.set(r.email, r);
    }
  }

  // E-mails versturen (samengevat per ontvanger).
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const summary = changes
    .map((c) => {
      const label = FIELD_LABELS[c.field] ?? c.field;
      const isDate = c.field === "deadline" || c.field === "start_date";
      const o = isDate ? fmtDate(c.old) : c.old || "—";
      const n = isDate ? fmtDate(c.new) : c.new || "—";
      return `<li><strong>${label}</strong>: ${o} → <strong>${n}</strong></li>`;
    })
    .join("");

  const phaseTitle = title || current.title;
  for (const r of recipients.values()) {
    const html = shell(
      `Planning gewijzigd: ${phaseTitle}`,
      `<p>De planning van de fase <strong>${phaseTitle}</strong> is bijgewerkt:</p><ul>${summary}</ul>`,
      site ? `${site}/fase/${phaseId}` : undefined,
    );
    await sendMail({ to: r.email!, subject: `Planning gewijzigd: ${phaseTitle}`, html });
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/fase/${phaseId}`);
  return { ok: true, changed: changes.length, mailed: recipients.size };
}
