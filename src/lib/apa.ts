import type { Source } from "@/lib/types";
import { fmtDate } from "@/lib/dates";

/** Bouwt een APA-achtige bronvermelding, afgestemd op het brontype. */
export function toApa(s: Source): string {
  const author = s.authors?.trim();
  const year = s.year?.trim() || "z.d.";
  const title = s.title.trim().replace(/\.?$/, "");
  const publisher = s.publisher?.trim();
  const url = s.url?.trim();
  const geraadpleegd = s.accessed_on ? `Geraadpleegd op ${fmtDate(s.accessed_on)}` : "";

  const start = author ? `${author.replace(/\.?$/, ".")} (${year}).` : `(${year}).`;
  const parts: string[] = [start];

  switch (s.source_type) {
    case "boek":
      // Auteur (jaar). Titel. Uitgever.
      parts.push(`${title}.`);
      if (publisher) parts.push(`${publisher.replace(/\.?$/, ".")}`);
      break;
    case "artikel":
      // Auteur (jaar). Titel. Tijdschrift/Krant. [url]
      parts.push(`${title}.`);
      if (publisher) parts.push(`${publisher.replace(/\.?$/, ".")}`);
      if (url) parts.push(url);
      break;
    case "video":
      // Auteur (jaar). Titel [Video]. Platform. url
      parts.push(`${title} [Video].`);
      if (publisher) parts.push(`${publisher.replace(/\.?$/, ".")}`);
      if (url) parts.push(url);
      break;
    case "interview":
      // Auteur (rol). Persoonlijke communicatie, datum.
      parts.push(`Persoonlijke communicatie${geraadpleegd ? `, ${geraadpleegd.toLowerCase()}` : ""}.`);
      break;
    case "website":
    default:
      // Auteur (jaar). Titel. Sitenaam. Geraadpleegd op …, van url
      parts.push(`${title}.`);
      if (publisher) parts.push(`${publisher.replace(/\.?$/, ".")}`);
      if (url) parts.push(geraadpleegd ? `${geraadpleegd}, van ${url}` : url);
      break;
  }

  return parts.filter(Boolean).join(" ");
}
