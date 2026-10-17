"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { esc, sendMail, shell } from "@/lib/email";

/** Verstuurt de uitnodiging per e-mail via de bestaande Resend-koppeling (als die is ingesteld). */
export async function mailUitnodiging(id: string, token: string): Promise<{ ok: boolean; reden?: string }> {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("pws_iv_mag_beheren");
  if (!mag) return { ok: false, reden: "geen toegang" };
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { ok: false, reden: "ongeldige link" };

  const { data: u } = await supabase.from("pws_iv_uitnodigingen").select("naam, email, aanspreekvorm, boodschap").eq("id", id).single();
  if (!u?.email) return { ok: false, reden: "geen e-mailadres" };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const link = `${process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`}/interview/${token}`;
  const je = u.aanspreekvorm === "je";

  const body = `
    <p>${je ? "Hoi" : "Beste"} ${esc(u.naam)},</p>
    <p>Ik ben Dean, leerling in 6 vwo. Voor mijn profielwerkstuk over AI en de arbeidsmarkt ${je ? "zou ik je" : "zou ik u"} graag interviewen.
    Het interview bestaat uit open vragen die ${je ? "je" : "u"} online kunt beantwoorden, wanneer het ${je ? "jou" : "u"} uitkomt.
    ${je ? "Je antwoorden" : "Uw antwoorden"} worden tussentijds opgeslagen.</p>
    ${u.boodschap ? `<p style="border-left:3px solid #2f7d5b;padding-left:12px">${esc(u.boodschap).replace(/\n/g, "<br/>")}</p>` : ""}
    <p>Alvast heel erg bedankt!<br/>Dean</p>
    <p style="font-size:13px;color:#64748b">Deze link is persoonlijk. Deel hem niet met anderen.</p>`;

  const ok = await sendMail({ to: u.email, subject: "Uitnodiging: interview voor mijn profielwerkstuk", html: shell("Interview over AI en de arbeidsmarkt", body, link).replace("Open in de tool", "Naar het interview") });
  return ok ? { ok: true } : { ok: false, reden: "e-mail niet beschikbaar" };
}
