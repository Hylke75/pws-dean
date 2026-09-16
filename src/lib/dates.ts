const MONTHS = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

export function parseDate(d: string | null): Date | null {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

export function fmtDate(d: string | null): string {
  const dt = parseDate(d);
  if (!dt) return "—";
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function fmtRange(start: string | null, end: string | null): string {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return fmtDate(start) + (end ? " – " + fmtDate(end) : "");
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function daysUntil(d: string | null): number | null {
  const dt = parseDate(d);
  if (!dt) return null;
  const ms = dt.getTime() - today().getTime();
  return Math.round(ms / 86400000);
}

export function humanUntil(d: string | null): string {
  const n = daysUntil(d);
  if (n === null) return "";
  if (n < 0) return `${Math.abs(n)} dagen geleden`;
  if (n === 0) return "vandaag";
  if (n === 1) return "morgen";
  return `over ${n} dagen`;
}

export function isPast(d: string | null): boolean {
  const n = daysUntil(d);
  return n !== null && n < 0;
}
