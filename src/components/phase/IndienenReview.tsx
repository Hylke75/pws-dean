"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitPhase, reviewPhase } from "@/app/fase/actions";
import type { Review, ReviewStatus } from "@/lib/types";
import { REVIEW_STATUS_LABELS } from "@/lib/types";

const BADGE: Record<ReviewStatus, string> = {
  concept: "bg-slate-100 text-slate-600",
  ingediend: "bg-sky-100 text-sky-700",
  goedgekeurd: "bg-emerald-100 text-emerald-700",
  wijzigingen_nodig: "bg-amber-100 text-amber-700",
};

function ago(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default function IndienenReview({
  phaseId,
  reviewStatus,
  isReviewer,
  reviews,
}: {
  phaseId: string;
  reviewStatus: ReviewStatus;
  isReviewer: boolean;
  reviews: Review[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus>(reviewStatus);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Begeleider-form
  const [reviewKind, setReviewKind] = useState<"goedgekeurd" | "wijzigingen_nodig" | "opmerking">("goedgekeurd");
  const [feedback, setFeedback] = useState("");

  async function indienen() {
    setBusy(true);
    setMsg("");
    const res = await submitPhase(phaseId);
    setBusy(false);
    if (res.ok) {
      setStatus("ingediend");
      setMsg("Ingediend bij je begeleider ✓");
      router.refresh();
    } else {
      setMsg(res.error ?? "Er ging iets mis");
    }
  }

  async function beoordeel() {
    setBusy(true);
    setMsg("");
    const res = await reviewPhase(phaseId, reviewKind, feedback);
    setBusy(false);
    if (res.ok) {
      setFeedback("");
      if (reviewKind !== "opmerking") setStatus(reviewKind === "goedgekeurd" ? "goedgekeurd" : "wijzigingen_nodig");
      setMsg("Feedback verstuurd ✓");
      router.refresh();
    } else {
      setMsg(res.error ?? "Er ging iets mis");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Status:</span>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[status]}`}>
          {REVIEW_STATUS_LABELS[status]}
        </span>
      </div>

      {/* Reviewdraad */}
      {reviews.length > 0 && (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.status === "goedgekeurd"
                      ? "bg-emerald-100 text-emerald-700"
                      : r.status === "wijzigingen_nodig"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {r.status === "goedgekeurd" ? "Goedgekeurd" : r.status === "wijzigingen_nodig" ? "Wijzigingen nodig" : "Opmerking"}
                </span>
                <span className="text-xs text-slate-400">{ago(r.created_at)}</span>
              </div>
              {r.feedback && <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{r.feedback}</p>}
            </li>
          ))}
        </ul>
      )}

      {/* Actie */}
      {isReviewer ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-slate-800">Feedback geven</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {(["goedgekeurd", "wijzigingen_nodig", "opmerking"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setReviewKind(k)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  reviewKind === k ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {k === "goedgekeurd" ? "Goedkeuren" : k === "wijzigingen_nodig" ? "Wijzigingen nodig" : "Opmerking"}
              </button>
            ))}
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="Jouw feedback voor de leerling…"
            className="w-full resize-y rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={beoordeel}
            disabled={busy}
            className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Versturen…" : "Feedback versturen"}
          </button>
        </div>
      ) : (
        <div>
          {status === "ingediend" ? (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
              Ingediend — je ouders bekijken je werk. Je krijgt bericht zodra er feedback is.
            </p>
          ) : (
            <button
              onClick={indienen}
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "Indienen…" : status === "wijzigingen_nodig" ? "Opnieuw indienen ter beoordeling" : "Indienen ter beoordeling"}
            </button>
          )}
        </div>
      )}

      {msg && <p className="text-sm text-slate-500">{msg}</p>}
    </div>
  );
}
