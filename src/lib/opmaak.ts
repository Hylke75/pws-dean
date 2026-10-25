/** Opgemaakte tekst in het verslag: de editor bewaart eenvoudige HTML (vet, cursief, lijsten, tussenkoppen). */

const TOEGESTAAN = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "h3", "h4", "blockquote"]);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isHtml(s: string): boolean {
  return /^\s*<(p|ul|ol|h[1-6]|blockquote)[\s>]/i.test(s);
}

/** Zet gewone tekst (oude notities, tekst uit de fases) om naar HTML voor de editor. */
export function naarHtml(tekst: string): string {
  if (!tekst.trim()) return "";
  if (isHtml(tekst)) return tekst;
  return tekst
    .trim()
    .split(/\n\s*\n/)
    .map((a) => `<p>${esc(a).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Laat alleen opmaaktags zonder attributen over, zodat de export veilig is. */
export function schoonHtml(html: string): string {
  return naarHtml(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?([a-z0-9]+)[^>]*>/gi, (tag, naam: string) => {
      const n = naam.toLowerCase();
      if (!TOEGESTAAN.has(n)) return "";
      return tag.startsWith("</") ? `</${n}>` : n === "br" ? "<br>" : `<${n}>`;
    });
}

/** Platte tekst, voor woorden tellen en korte overzichten. */
export function naarTekst(s: string): string {
  if (!isHtml(s)) return s.trim();
  return s
    .replace(/<\/(p|li|h[1-6]|blockquote)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
