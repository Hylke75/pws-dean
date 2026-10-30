import { labelsVoor, pct, schaalVerdeling, telKeuzes, type Reactie, type Vraag } from "@/lib/enquete";

/**
 * Grafieken voor de Word-export. Word toont geen SVG of canvas uit HTML, daarom zijn de
 * staven tabelcellen met een achtergrondkleur; zo blijven ze zichtbaar en bewerkbaar.
 */

const KLEUR = "#059669";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Rij = { label: string; n: number; totaal: number; kleur?: string; inspring?: boolean; kop?: boolean };

function staaf(p: number, kleur: string) {
  if (p <= 0) return "&nbsp;";
  const w = Math.max(1, p);
  return `<table width="${w}%" cellspacing="0" cellpadding="0" style="width:${w}%;border-collapse:collapse"><tr><td bgcolor="${kleur}" style="background:${kleur};height:9pt;font-size:5pt">&nbsp;</td></tr></table>`;
}

function staafTabel(rijen: Rij[]): string {
  const tr = rijen
    .map((r) => {
      if (r.kop) return `<tr><td colspan="3" style="font-size:9pt;font-weight:bold;padding-top:4pt">${esc(r.label)}</td></tr>`;
      const p = pct(r.n, r.totaal);
      return `<tr><td width="38%" style="font-size:9pt;${r.inspring ? "padding-left:12pt;color:#555" : ""}">${esc(r.label)}</td><td width="47%">${staaf(p, r.kleur ?? KLEUR)}</td><td width="15%" style="font-size:9pt;text-align:right">${r.n} (${p}%)</td></tr>`;
    })
    .join("");
  return `<table width="100%" cellspacing="0" cellpadding="2" style="border-collapse:collapse">${tr}</table>`;
}

/** Eén vraag uit één enquête. Open vragen hebben geen grafiek. */
export function enkelHtml(v: Vraag, reacties: Reactie[]): string {
  if (v.type === "open") return "";
  if (v.type === "schaal") {
    const d = schaalVerdeling(v, reacties);
    return staafTabel(labelsVoor(v).map((l, i) => ({ label: l, n: d.counts[i], totaal: d.n })));
  }
  if (v.type === "stellingen") {
    const labels = labelsVoor(v);
    return staafTabel(
      (v.config.items ?? []).map((s, i) => {
        const d = schaalVerdeling(v, reacties, i);
        return { label: `${s} (% ${labels[3].toLowerCase()} of ${labels[4].toLowerCase()})`, n: d.counts[3] + d.counts[4], totaal: d.n };
      }),
    );
  }
  const { tellingen, beantwoord } = telKeuzes(v, reacties);
  const rijen = v.type === "meerdere" ? [...tellingen].sort((a, b) => b.n - a.n) : tellingen;
  return staafTabel(rijen.map((t) => ({ label: t.waarde, n: t.n, totaal: beantwoord })));
}

export type VergelijkReeks = { naam: string; kleur: string; vraag: Vraag; reacties: Reactie[] };

/** Dezelfde vraag per doelgroep: per antwoord een staaf per groep. */
export function vergelijkHtml(per: VergelijkReeks[]): string {
  const legenda = per
    .map((g) => `<span style="color:${g.kleur};font-size:9pt">■</span> <span style="font-size:9pt">${esc(g.naam)} (n = ${g.reacties.length})</span>`)
    .join("&nbsp;&nbsp;&nbsp;");
  const eerste = per[0].vraag;
  const rijen: Rij[] = [];

  if (eerste.type === "schaal" || eerste.type === "stellingen") {
    const labels = labelsVoor(eerste);
    const items = eerste.type === "stellingen" ? (eerste.config.kort ?? eerste.config.items ?? []) : [""];
    items.forEach((label, i) => {
      rijen.push({ label: label || `% ${labels[3].toLowerCase()} of ${labels[4].toLowerCase()}`, n: 0, totaal: 0, kop: true });
      for (const g of per) {
        const d = schaalVerdeling(g.vraag, g.reacties, eerste.type === "stellingen" ? i : undefined);
        rijen.push({ label: g.naam, n: d.counts[3] + d.counts[4], totaal: d.n, kleur: g.kleur, inspring: true });
      }
    });
  } else {
    const tel = per.map((g) => ({ g, ...telKeuzes(g.vraag, g.reacties) }));
    const opties = new Map<string, string>();
    for (const t of tel) for (const x of t.tellingen) if (!opties.has(x.code)) opties.set(x.code, x.waarde);
    for (const [code, label] of opties) {
      rijen.push({ label, n: 0, totaal: 0, kop: true });
      for (const t of tel) rijen.push({ label: t.g.naam, n: t.tellingen.find((x) => x.code === code)?.n ?? 0, totaal: t.beantwoord, kleur: t.g.kleur, inspring: true });
    }
  }
  const tabel = staafTabel(rijen);
  return `<p>${legenda}</p>${tabel}`;
}
