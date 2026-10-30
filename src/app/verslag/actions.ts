"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esc, sendMail, shell } from "@/lib/email";
import type { Opmerking } from "@/lib/types";

type Resultaat<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
type Ontvanger = { email: string | null; full_name: string | null };

/** Plaatst een opmerking bij een hoofdstuk en laat de ander(en) het weten. */
export async function plaatsOpmerking(hoofdstuk: string, hoofdstukTitel: string, tekst: string): Promise<Resultaat<Opmerking>> {
  const t = tekst.trim();
  if (!t) return { ok: false, error: "Schrijf eerst een opmerking." };
  if (t.length > 4000) return { ok: false, error: "De opmerking is te lang (maximaal 4000 tekens)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Je bent niet ingelogd." };

  const { data: ik } = await supabase.from("pws_profiles").select("full_name, role").eq("id", user.id).single();
  const naam = ik?.full_name ?? "Iemand";
  const { data, error } = await supabase
    .from("pws_verslag_opmerkingen")
    .insert({ hoofdstuk: hoofdstuk.slice(0, 200), tekst: t, auteur: user.id, auteur_naam: naam })
    .select()
    .single();
  if (error) return { ok: false, error: "Opslaan lukte niet. Probeer het opnieuw." };

  // Van de leerling naar de begeleiders/ouders, of andersom.
  const naarLeerling = ik?.role !== "student";
  const titel = `${naam} plaatste een opmerking bij "${hoofdstukTitel}"`;
  const { data: ontvangers } = await supabase.rpc("pws_notify_role", {
    p_role: naarLeerling ? "student" : "ouder",
    p_type: "system",
    p_title: titel.slice(0, 300),
    p_body: t.slice(0, 500),
    p_link: "/verslag",
  });
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  for (const r of (ontvangers as Ontvanger[]) ?? []) {
    if (!r.email) continue;
    await sendMail({
      to: r.email,
      subject: `Opmerking bij je PWS: ${hoofdstukTitel}`.slice(0, 150),
      html: shell(
        "Nieuwe opmerking bij het verslag",
        `<p><strong>${esc(naam)}</strong> schreef bij <strong>${esc(hoofdstukTitel)}</strong>:</p><blockquote style="margin:0;padding:8px 12px;border-left:3px solid #cbd5e1;color:#334155">${esc(t).replace(/\n/g, "<br/>")}</blockquote>`,
        site ? `${site}/verslag` : undefined,
      ),
    });
  }

  revalidatePath("/verslag");
  return { ok: true, data: data as Opmerking };
}

export async function zetVerwerkt(id: string, verwerkt: boolean): Promise<Resultaat> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pws_verslag_opmerkingen")
    .update({ verwerkt, verwerkt_op: verwerkt ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: "Opslaan lukte niet." };
  revalidatePath("/verslag");
  return { ok: true };
}

/** Alleen de schrijver kan een eigen opmerking verwijderen (afgedwongen in de database). */
export async function verwijderOpmerking(id: string): Promise<Resultaat> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("pws_verslag_opmerkingen").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, error: "Verwijderen lukte niet." };
  revalidatePath("/verslag");
  return { ok: true };
}
