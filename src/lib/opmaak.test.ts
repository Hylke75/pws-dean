import { describe, expect, it } from "vitest";
import { naarHtml, naarTekst, schoonHtml } from "./opmaak";

describe("opmaak", () => {
  it("zet gewone tekst om naar alinea's", () => {
    expect(naarHtml("Een\nregel\n\nTwee <b>")).toBe("<p>Een<br>regel</p><p>Twee &lt;b&gt;</p>");
  });
  it("laat alleen veilige opmaak over", () => {
    expect(schoonHtml('<p onclick="x"><strong>Vet</strong><script>alert(1)</script><a href="y">link</a></p>')).toBe(
      "<p><strong>Vet</strong>link</p>",
    );
  });
  it("maakt platte tekst van opgemaakte tekst", () => {
    expect(naarTekst("<p>Een &amp; twee</p><ul><li>drie</li></ul>")).toBe("Een & twee\ndrie");
  });
});
