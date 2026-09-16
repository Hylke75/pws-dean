import { Resend } from "resend";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || "PWS Dean <onboarding@resend.dev>";

type Mail = { to: string; subject: string; html: string };

/**
 * Verstuurt een mail via Resend. Als er geen API-key is geconfigureerd,
 * wordt de mail stil overgeslagen (in-app notificaties werken dan nog wel).
 */
export async function sendMail({ to, subject, html }: Mail): Promise<boolean> {
  if (!KEY) {
    console.warn("[email] RESEND_API_KEY ontbreekt — mail overgeslagen:", subject);
    return false;
  }
  try {
    const resend = new Resend(KEY);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email] Resend-fout:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] uitzondering:", e);
    return false;
  }
}

export function shell(title: string, bodyHtml: string, ctaUrl?: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e6e9ee">
      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#2f7d5b;font-weight:700">PWS-tracker</div>
      <h1 style="font-size:20px;margin:8px 0 12px;color:#0f172a">${title}</h1>
      <div style="font-size:15px;line-height:1.6;color:#334155">${bodyHtml}</div>
      ${
        ctaUrl
          ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:20px;background:#2f7d5b;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px">Open in de tool</a>`
          : ""
      }
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">Je ontvangt dit omdat je aan het PWS werkt.</p>
  </div></body></html>`;
}
