import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMail, shell } from "@/lib/email";
import { fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type ReminderRow = {
  email: string | null;
  full_name: string | null;
  phase_title: string;
  deadline: string;
  days_left: number;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase.rpc("pws_run_reminders");
  if (error) {
    console.error("[cron] rpc-fout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data as ReminderRow[]) ?? [];
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  let mailed = 0;

  for (const r of rows) {
    if (!r.email) continue;
    const when =
      r.days_left === 0
        ? "vandaag"
        : r.days_left === 1
          ? "morgen"
          : `over ${r.days_left} dagen`;
    const html = shell(
      `Deadline ${when}: ${r.phase_title}`,
      `<p>Denk eraan: de fase <strong>${r.phase_title}</strong> heeft een deadline op <strong>${fmtDate(r.deadline)}</strong> (${when}).</p><p>Zorg dat je op schema blijft 💪</p>`,
      site || undefined,
    );
    const ok = await sendMail({
      to: r.email,
      subject: `⏰ Deadline ${when}: ${r.phase_title}`,
      html,
    });
    if (ok) mailed++;
  }

  return NextResponse.json({ ok: true, reminders: rows.length, mailed });
}
