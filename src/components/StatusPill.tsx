import type { PhaseStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const STYLES: Record<PhaseStatus, string> = {
  te_doen: "bg-slate-100 text-slate-600",
  bezig: "bg-amber-100 text-amber-700",
  klaar: "bg-emerald-100 text-emerald-700",
};

export default function StatusPill({ status }: { status: PhaseStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
