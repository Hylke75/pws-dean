import type { Source } from "@/lib/types";
import { fmtDate } from "@/lib/dates";

/** Bouwt een APA-achtige bronvermelding uit de losse velden. */
export function toApa(s: Source): string {
  const parts: string[] = [];
  const author = s.authors?.trim();
  const year = s.year?.trim();

  if (author) parts.push(author + ".");
  parts.push(`(${year || "z.d."}).`);
  parts.push(s.title.trim().replace(/\.?$/, "."));

  if (s.publisher?.trim()) parts.push(s.publisher.trim().replace(/\.?$/, "."));

  if (s.url?.trim()) {
    if (s.accessed_on) {
      parts.push(`Geraadpleegd op ${fmtDate(s.accessed_on)}, van ${s.url.trim()}`);
    } else {
      parts.push(s.url.trim());
    }
  }
  return parts.join(" ");
}
