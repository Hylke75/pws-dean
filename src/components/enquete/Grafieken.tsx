import { pct, type Telling, type Verdeling } from "@/lib/enquete";

/** Diverging schaal: rood (laag) – grijs (neutraal) – blauw (hoog). */
export const SCHAAL_KLEUREN = ["#c2413e", "#ee9a8f", "#d6d4ce", "#86b6ef", "#2a78d6"];
const SCHAAL_TEKST = ["#ffffff", "#0f172a", "#0f172a", "#0f172a", "#ffffff"];

/** Vaste kleur per doelgroep (op volgorde, nooit gecycled). */
export const GROEP_KLEUREN = ["#2a78d6", "#eb6834", "#1baf7a"];

export function fmt(n: number | null, d = 1) {
  return n === null ? "–" : n.toLocaleString("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Horizontale staven met aantal en percentage. */
export function Staven({
  tellingen,
  totaal,
  kleur = "#059669",
  sorteer = false,
}: {
  tellingen: Telling[];
  totaal: number;
  kleur?: string;
  sorteer?: boolean;
}) {
  const rijen = sorteer ? [...tellingen].sort((a, b) => b.n - a.n) : tellingen;
  const max = Math.max(1, ...rijen.map((r) => r.n));
  return (
    <div className="space-y-2">
      {rijen.map((r) => (
        <div key={r.waarde} title={`${r.waarde}: ${r.n} (${pct(r.n, totaal)}%)`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-slate-700">{r.waarde}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {r.n} · <span className="font-semibold text-slate-800">{pct(r.n, totaal)}%</span>
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(r.n / max) * 100}%`, backgroundColor: kleur, minWidth: r.n ? 4 : 0 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Eén 100%-gestapelde balk voor een 1–5-schaal. */
export function VerdelingBalk({ verdeling, labels }: { verdeling: Verdeling; labels: string[] }) {
  const { counts, n } = verdeling;
  if (!n) return <div className="h-7 rounded-md bg-slate-100" />;
  return (
    <div className="flex h-7 w-full gap-[2px] overflow-hidden rounded-md">
      {counts.map((c, i) => {
        const p = (c / n) * 100;
        if (!c) return null;
        return (
          <div
            key={i}
            title={`${labels[i]}: ${c} (${Math.round(p)}%)`}
            className="flex items-center justify-center text-xs font-semibold tabular-nums"
            style={{ width: `${p}%`, backgroundColor: SCHAAL_KLEUREN[i], color: SCHAAL_TEKST[i] }}
          >
            {p >= 9 ? `${Math.round(p)}%` : ""}
          </div>
        );
      })}
    </div>
  );
}

export function SchaalLegenda({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
      {labels.map((l, i) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SCHAAL_KLEUREN[i] }} />
          {l}
        </span>
      ))}
    </div>
  );
}

/** Rij: label, gestapelde balk, gemiddelde en 'weet ik niet'. */
export function VerdelingRij({
  label,
  verdeling,
  labels,
  kleurStip,
}: {
  label: string;
  verdeling: Verdeling;
  labels: string[];
  kleurStip?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-700">
          {kleurStip && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: kleurStip }} />}
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-slate-500">
          gem. <span className="font-semibold text-slate-800">{fmt(verdeling.gemiddelde)}</span>
          {verdeling.weetNiet > 0 && <> · {verdeling.weetNiet}× weet niet</>}
        </span>
      </div>
      <div className="mt-1">
        <VerdelingBalk verdeling={verdeling} labels={labels} />
      </div>
    </div>
  );
}

/** Stippen op een 1–5-as: gemiddelde per groep. */
export function GemiddeldeStippen({
  label,
  waarden,
}: {
  label: string;
  waarden: { naam: string; kleur: string; gemiddelde: number | null; n: number }[];
}) {
  return (
    <div>
      <p className="text-sm text-slate-700">{label}</p>
      <div className="relative mt-2 h-6">
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
        {[0, 1, 2, 3, 4].map((t) => (
          <div key={t} className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-slate-300" style={{ left: `${t * 25}%` }} />
        ))}
        {waarden.map((w) =>
          w.gemiddelde === null ? null : (
            <div
              key={w.naam}
              title={`${w.naam}: gemiddeld ${fmt(w.gemiddelde)} (n = ${w.n})`}
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
              style={{ left: `${((w.gemiddelde - 1) / 4) * 100}%`, backgroundColor: w.kleur }}
            />
          ),
        )}
      </div>
      <p className="mt-1 text-xs tabular-nums text-slate-500">
        {waarden.map((w, i) => (
          <span key={w.naam}>
            {i > 0 && " · "}
            {w.naam} {fmt(w.gemiddelde)}
          </span>
        ))}
      </p>
    </div>
  );
}

export function GroepLegenda({ groepen }: { groepen: { naam: string; kleur: string; n: number }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      {groepen.map((g) => (
        <span key={g.naam} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.kleur }} />
          {g.naam} <span className="text-slate-400">(n = {g.n})</span>
        </span>
      ))}
    </div>
  );
}
