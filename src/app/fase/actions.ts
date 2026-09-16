"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendMail, shell } from "@/lib/email";

type Recipient = { email: string | null; full_name: string | null };

/** Student dient een fase in bij de begeleider ter beoordeling. */
export async function submitPhase(phaseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const { data: phase } = await supabase
    .from("pws_phases")
    .select("title, order_index")
    .eq("id", phaseId)
    .single();
  if (!phase) return { ok: false, error: "Fase niet gevonden" };

  const { error: updErr } = await supabase
    .from("pws_phases")
    .update({ review_status: "ingediend", submitted_at: new Date().toISOString() })
    .eq("id", phaseId);
  if (updErr) return { ok: false, error: updErr.message };

  const { data: me } = await supabase
    .from("pws_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const wie = me?.full_name ?? "De leerling";

  const { data: recipients } = await supabase.rpc("pws_notify_role", {
    p_role: "begeleider",
    p_type: "system",
    p_title: `Ingediend ter beoordeling: ${phase.title}`,
    p_body: `${wie} heeft fase ${phase.order_index} "${phase.title}" ingediend.`,
    p_link: `/fase/${phaseId}`,
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  for (const r of (recipients as Recipient[]) ?? []) {
    if (!r.email) continue;
    await sendMail({
      to: r.email,
      subject: `PWS ingediend: ${phase.title}`,
      html: shell(
        `Ingediend ter beoordeling: ${phase.title}`,
        `<p>${wie} heeft fase <strong>${phase.order_index} — ${phase.title}</strong> ingediend en vraagt om jouw feedback.</p>`,
        site ? `${site}/fase/${phaseId}` : undefined,
      ),
    });
  }

  revalidatePath(`/fase/${phaseId}`);
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, mailed: ((recipients as Recipient[]) ?? []).length };
}

/** Begeleider geeft feedback op een ingediende fase. */
export async function reviewPhase(
  phaseId: string,
  status: "goedgekeurd" | "wijzigingen_nodig" | "opmerking",
  feedback: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const { data: me } = await supabase.from("pws_profiles").select("role").eq("id", user.id).single();
  if (!me || me.role !== "begeleider") return { ok: false, error: "Alleen de begeleider kan beoordelen" };

  const { data: phase } = await supabase
    .from("pws_phases")
    .select("title, order_index")
    .eq("id", phaseId)
    .single();
  if (!phase) return { ok: false, error: "Fase niet gevonden" };

  const { error: insErr } = await supabase.from("pws_reviews").insert({
    phase_id: phaseId,
    status,
    feedback: feedback.trim() || null,
    created_by: user.id,
  });
  if (insErr) return { ok: false, error: insErr.message };

  // Reviewstatus alleen aanpassen bij goedkeuren of wijzigingen; 'opmerking' laat status ongemoeid.
  if (status !== "opmerking") {
    await supabase
      .from("pws_phases")
      .update({ review_status: status === "goedgekeurd" ? "goedgekeurd" : "wijzigingen_nodig" })
      .eq("id", phaseId);
  }

  const label =
    status === "goedgekeurd" ? "goedgekeurd ✅" : status === "wijzigingen_nodig" ? "wijzigingen nodig" : "een opmerking";

  const { data: recipients } = await supabase.rpc("pws_notify_role", {
    p_role: "student",
    p_type: "system",
    p_title: `Feedback op ${phase.title}: ${label}`,
    p_body: feedback.trim() ? feedback.trim().slice(0, 160) : `De begeleider heeft je fase beoordeeld: ${label}.`,
    p_link: `/fase/${phaseId}`,
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  for (const r of (recipients as Recipient[]) ?? []) {
    if (!r.email) continue;
    await sendMail({
      to: r.email,
      subject: `Feedback op je PWS: ${phase.title}`,
      html: shell(
        `Feedback op fase ${phase.order_index}: ${phase.title}`,
        `<p>Je begeleider heeft je werk beoordeeld: <strong>${label}</strong>.</p>${
          feedback.trim() ? `<p style="white-space:pre-wrap">${feedback.trim()}</p>` : ""
        }`,
        site ? `${site}/fase/${phaseId}` : undefined,
      ),
    });
  }

  revalidatePath(`/fase/${phaseId}`);
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}
