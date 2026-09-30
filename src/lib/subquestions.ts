import type { Subquestion } from "@/lib/types";

/** Eerste, niet-lege regel van een deelvraag — handig als korte titel. */
export function deelvraagTitel(text: string): string {
  const eerste = text
    .split("\n")
    .map((r) => r.trim())
    .find((r) => r.length > 0);
  return eerste ?? "";
}

/** Kort label voor een deelvraag, bijv. "Deelvraag 2 · Universiteiten". */
export function deelvraagLabel(sq: Subquestion, index: number, maxLen = 60): string {
  const titel = deelvraagTitel(sq.text);
  const kort = titel.length > maxLen ? `${titel.slice(0, maxLen - 1)}…` : titel;
  return kort ? `Deelvraag ${index + 1} · ${kort}` : `Deelvraag ${index + 1}`;
}
