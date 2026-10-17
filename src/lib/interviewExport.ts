import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { Document, HeadingLevel, Packer, Paragraph, TextRun, PageBreak } from "docx";
import {
  ZONDER_THEMA,
  pdfVeilig,
  privacyNotitie,
  vergelijkPerThema,
  weergave,
  type IvAntwoord,
  type IvThema,
  type IvUitnodiging,
} from "./interview";

export type ExportData = {
  uitnodigingen: IvUitnodiging[];
  antwoorden: IvAntwoord[];
  themas: IvThema[];
  nummers: Map<string, number>;
  anoniem: boolean;
};

const datum = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" }) : "–";

function antwoordVan(d: ExportData, uid: string, key: string) {
  return d.antwoorden.find((a) => a.uitnodiging_id === uid && a.vraag_key === key)?.antwoord.trim() ?? "";
}

/** Gemeenschappelijke opbouw van een verslag, zodat PDF en Word precies dezelfde inhoud hebben. */
type Blok =
  | { soort: "titel"; tekst: string }
  | { soort: "kop"; tekst: string }
  | { soort: "subkop"; tekst: string }
  | { soort: "meta"; tekst: string }
  | { soort: "let-op"; tekst: string }
  | { soort: "tekst"; tekst: string }
  | { soort: "leeg"; tekst: string }
  | { soort: "nieuwe-pagina" };

function verslagBlokken(d: ExportData): Blok[] {
  const uit: Blok[] = [];
  d.uitnodigingen.forEach((u, i) => {
    if (i > 0) uit.push({ soort: "nieuwe-pagina" });
    const w = weergave(u, d.nummers.get(u.id) ?? 0, d.anoniem);
    uit.push({ soort: "titel", tekst: `Interviewverslag – ${w.label}` });
    if (w.functie) uit.push({ soort: "meta", tekst: `Functie: ${w.functie}` });
    if (w.organisatie) uit.push({ soort: "meta", tekst: `Organisatie: ${w.organisatie}` });
    uit.push({ soort: "meta", tekst: `Interviewtype: ${u.type_naam}` });
    uit.push({ soort: "meta", tekst: u.afgerond_op ? `Afgerond op: ${datum(u.afgerond_op)}` : `Status: nog niet afgerond (laatste activiteit ${datum(u.laatste_activiteit)})` });
    for (const n of privacyNotitie(w)) uit.push({ soort: "let-op", tekst: `Let op: ${n}` });
    u.vragen.forEach((v, j) => {
      uit.push({ soort: "subkop", tekst: `${j + 1}. ${v.tekst}` });
      const a = antwoordVan(d, u.id, v.key);
      uit.push(a ? { soort: "tekst", tekst: a } : { soort: "leeg", tekst: "(niet beantwoord)" });
    });
  });
  return uit;
}

function vergelijkBlokken(d: ExportData): Blok[] {
  const uit: Blok[] = [{ soort: "titel", tekst: "Vergelijkend rapport interviews" }];
  uit.push({ soort: "meta", tekst: `${d.uitnodigingen.length} respondenten · gemaakt op ${datum(new Date().toISOString())}` });
  const groepen = [...d.themas.map((t) => ({ key: t.key, naam: t.naam })), { key: ZONDER_THEMA, naam: "Overige vragen" }];
  for (const g of groepen) {
    const rijen = vergelijkPerThema(d.uitnodigingen, d.antwoorden, g.key);
    if (!rijen.length) continue;
    uit.push({ soort: "kop", tekst: g.naam });
    for (const r of rijen) {
      uit.push({ soort: "subkop", tekst: r.tekst });
      for (const a of r.antwoorden) {
        const u = d.uitnodigingen.find((x) => x.id === a.uitnodiging_id)!;
        const w = weergave(u, d.nummers.get(u.id) ?? 0, d.anoniem);
        uit.push({ soort: "meta", tekst: `${w.label}${w.magCiteren ? "" : " – niet letterlijk citeren"}` });
        uit.push(a.antwoord ? { soort: "tekst", tekst: a.antwoord } : { soort: "leeg", tekst: "(niet beantwoord)" });
      }
    }
  }
  return uit;
}

/* ---------------- PDF ---------------- */

async function naarPdf(blokken: Blok[], titel: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(titel);
  doc.setLanguage("nl-NL");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const vet = await doc.embedFont(StandardFonts.HelveticaBold);
  const cursief = await doc.embedFont(StandardFonts.HelveticaOblique);
  const [B, H] = [595.28, 841.89];
  const M = 56;
  const breedte = B - 2 * M;
  let page: PDFPage = doc.addPage([B, H]);
  let y = H - M;

  const cache = new Map<string, boolean>();
  const kan = (font: PDFFont) => (t: string) => {
    const k = font.name + t;
    if (!cache.has(k)) {
      try {
        font.encodeText(t);
        cache.set(k, true);
      } catch {
        cache.set(k, false);
      }
    }
    return cache.get(k)!;
  };

  function regels(tekst: string, font: PDFFont, size: number): string[] {
    const uit: string[] = [];
    for (const alinea of pdfVeilig(tekst, kan(font)).split("\n")) {
      if (!alinea.trim()) {
        uit.push("");
        continue;
      }
      let regel = "";
      for (const woord of alinea.split(/ +/)) {
        const proef = regel ? `${regel} ${woord}` : woord;
        if (font.widthOfTextAtSize(proef, size) <= breedte) {
          regel = proef;
          continue;
        }
        if (regel) uit.push(regel);
        // Te lange woorden (bv. URL's) op tekenniveau afbreken.
        let rest = woord;
        while (font.widthOfTextAtSize(rest, size) > breedte) {
          let n = rest.length;
          while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > breedte) n--;
          uit.push(rest.slice(0, n));
          rest = rest.slice(n);
        }
        regel = rest;
      }
      uit.push(regel);
    }
    return uit;
  }

  function schrijf(tekst: string, font: PDFFont, size: number, kleur = rgb(0.07, 0.09, 0.15), voor = 0, na = 4) {
    y -= voor;
    const hoogte = size * 1.4;
    for (const r of regels(tekst, font, size)) {
      if (y - hoogte < M) {
        page = doc.addPage([B, H]);
        y = H - M;
      }
      y -= hoogte;
      if (r) page.drawText(r, { x: M, y, size, font, color: kleur });
    }
    y -= na;
  }

  for (const b of blokken) {
    if (b.soort === "nieuwe-pagina") {
      page = doc.addPage([B, H]);
      y = H - M;
    } else if (b.soort === "titel") schrijf(b.tekst, vet, 18, undefined, 0, 8);
    else if (b.soort === "kop") schrijf(b.tekst, vet, 15, rgb(0.02, 0.37, 0.27), 14, 4);
    else if (b.soort === "subkop") schrijf(b.tekst, vet, 11.5, undefined, 10, 2);
    else if (b.soort === "meta") schrijf(b.tekst, regular, 10, rgb(0.28, 0.33, 0.41), 0, 1);
    else if (b.soort === "let-op") schrijf(b.tekst, vet, 10, rgb(0.7, 0.33, 0.04), 2, 1);
    else if (b.soort === "leeg") schrijf(b.tekst, cursief, 10.5, rgb(0.58, 0.64, 0.72));
    else schrijf(b.tekst, regular, 10.5);
  }

  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    p.drawText(pdfVeilig(`${titel} · pagina ${i + 1} van ${paginas.length}`, kan(regular)), {
      x: M, y: 28, size: 8, font: regular, color: rgb(0.58, 0.64, 0.72),
    });
  });
  return doc.save();
}

/* ---------------- Word ---------------- */

async function naarDocx(blokken: Blok[], titel: string): Promise<Uint8Array> {
  const kinderen: Paragraph[] = [];
  const tekstRuns = (tekst: string, opties: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) =>
    tekst.split("\n").map((r, i) => new TextRun({ text: r, break: i > 0 ? 1 : undefined, ...opties }));

  for (const b of blokken) {
    if (b.soort === "nieuwe-pagina") kinderen.push(new Paragraph({ children: [new PageBreak()] }));
    else if (b.soort === "titel") kinderen.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: tekstRuns(b.tekst) }));
    else if (b.soort === "kop") kinderen.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: tekstRuns(b.tekst) }));
    else if (b.soort === "subkop") kinderen.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 240 }, children: tekstRuns(b.tekst) }));
    else if (b.soort === "meta") kinderen.push(new Paragraph({ children: tekstRuns(b.tekst, { color: "475569" }) }));
    else if (b.soort === "let-op") kinderen.push(new Paragraph({ children: tekstRuns(b.tekst, { bold: true, color: "B45309" }) }));
    else if (b.soort === "leeg") kinderen.push(new Paragraph({ children: tekstRuns(b.tekst, { italics: true, color: "94A3B8" }) }));
    else {
      // Alinea's van het antwoord als losse alinea's, zodat Dean makkelijk kan selecteren.
      for (const alinea of b.tekst.split(/\n{2,}/)) kinderen.push(new Paragraph({ spacing: { after: 120 }, children: tekstRuns(alinea) }));
    }
  }

  const doc = new Document({
    title: titel,
    creator: "PWS-tracker",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children: kinderen }],
  });
  return new Uint8Array(await Packer.toBuffer(doc));
}

export async function verslagPdf(d: ExportData) {
  return naarPdf(verslagBlokken(d), "Interviewverslag");
}
export async function verslagDocx(d: ExportData) {
  return naarDocx(verslagBlokken(d), "Interviewverslag");
}
export async function vergelijkPdf(d: ExportData) {
  return naarPdf(vergelijkBlokken(d), "Vergelijkend rapport interviews");
}
export async function vergelijkDocx(d: ExportData) {
  return naarDocx(vergelijkBlokken(d), "Vergelijkend rapport interviews");
}
