"use client";

import { useState } from "react";
import { mailUitnodiging } from "@/app/interviews/actions";

/** Toont een zojuist gemaakte interviewlink. Die wordt maar één keer getoond: alleen een hash wordt bewaard. */
export default function LinkTonen({ id, token, email }: { id: string; token: string; email: string | null }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const [mail, setMail] = useState<"" | "bezig" | "ok" | "fout">("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/interview/${token}` : `/interview/${token}`;
  const tekst = `Bedankt dat u wilt meewerken aan mijn profielwerkstuk! Via deze persoonlijke link komt u bij het interview: ${link}`;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-slate-600">Persoonlijke link (wordt maar één keer getoond, kopieer hem nu):</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Interviewlink" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" />
        <button
          onClick={() => {
            navigator.clipboard.writeText(link);
            setGekopieerd(true);
            setTimeout(() => setGekopieerd(false), 1500);
          }}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {gekopieerd ? "Gekopieerd ✓" : "Kopieer link"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {email && (
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("Interview voor mijn profielwerkstuk")}&body=${encodeURIComponent(tekst)}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
          >
            Open in je eigen mailprogramma
          </a>
        )}
        {email && (
          <button
            disabled={mail === "bezig" || mail === "ok"}
            onClick={async () => {
              setMail("bezig");
              const r = await mailUitnodiging(id, token);
              setMail(r.ok ? "ok" : "fout");
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {mail === "bezig" ? "Versturen…" : mail === "ok" ? "Uitnodiging verstuurd ✓" : "Verstuur uitnodiging per e-mail"}
          </button>
        )}
      </div>
      {mail === "fout" && (
        <p className="text-sm text-amber-700">Automatisch mailen is niet ingesteld of lukte niet. Kopieer de link of gebruik je eigen mailprogramma.</p>
      )}
    </div>
  );
}
