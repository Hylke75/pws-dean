"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BevestigKnop from "@/components/BevestigKnop";
import { IV_STATUS_LABEL, IV_STATUS_STIJL, type IvAntwoord, type IvThema, type IvUitnodiging } from "@/lib/interview";
import LinkTonen from "./LinkTonen";

const datumTijd = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";

export default function InterviewBeheerDetail({
  u,
  heeftLink,
  antwoorden,
  themas,
}: {
  u: IvUitnodiging;
  heeftLink: boolean;
  antwoorden: IvAntwoord[];
  themas: IvThema[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [melding, setMelding] = useState("");
  const [bewerk, setBewerk] = useState(false);
  const [g, setG] = useState({ naam: u.naam, email: u.email ?? "", functie: u.functie ?? "", organisatie: u.organisatie ?? "" });
  const antw = new Map(antwoorden.map((a) => [a.vraag_key, a]));
  const themaNaam = new Map(themas.map((t) => [t.key, t.naam]));
  const heeftAntwoorden = antwoorden.some((a) => a.antwoord.trim());
  const t = u.toestemming;

  async function actie(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setMelding("");
    const { error } = await fn();
    setMelding(error ? "Dat lukte niet. Probeer het opnieuw." : ok);
    router.refresh();
  }

  async function nieuweLink() {
    const { data, error } = await supabase.rpc("pws_iv_nieuwe_link", { p_id: u.id });
    if (error || !data) return setMelding("Een nieuwe link maken lukte niet.");
    setToken(data as string);
    router.refresh();
  }

  async function opslaanGegevens(e: React.FormEvent) {
    e.preventDefault();
    if (!g.naam.trim()) return setMelding("Naam mag niet leeg zijn.");
    await actie(
      () => supabase.from("pws_iv_uitnodigingen").update({
        naam: g.naam.trim(), email: g.email.trim() || null, functie: g.functie.trim() || null, organisatie: g.organisatie.trim() || null,
      }).eq("id", u.id),
      "Gegevens opgeslagen.",
    );
    setBewerk(false);
  }

  const knop = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50";
  const veld = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500";

  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{u.naam}</h1>
            <p className="text-slate-600">{[u.functie, u.organisatie].filter(Boolean).join(" · ") || "Geen functie of organisatie ingevuld"}</p>
            <p className="text-sm text-slate-500">{u.type_naam}{u.email ? ` · ${u.email}` : ""}</p>
            {u.taal === "en" && <p className="mt-1 text-sm font-medium text-sky-700">De respondent vult het interview in het Engels in.</p>}
          </div>
          <div className="flex items-center gap-2">
            {u.gearchiveerd && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Gearchiveerd</span>}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${IV_STATUS_STIJL[u.status]}`}>{IV_STATUS_LABEL[u.status]}</span>
          </div>
        </div>
        <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          <div><dt className="inline text-slate-500">Uitgenodigd: </dt><dd className="inline text-slate-800">{datumTijd(u.uitgenodigd_op)}</dd></div>
          <div><dt className="inline text-slate-500">Laatste activiteit: </dt><dd className="inline text-slate-800">{datumTijd(u.laatste_activiteit)}</dd></div>
          <div><dt className="inline text-slate-500">Afgerond: </dt><dd className="inline text-slate-800">{datumTijd(u.afgerond_op)}</dd></div>
          <div><dt className="inline text-slate-500">Bewaren tot: </dt><dd className="inline text-slate-800">{u.bewaren_tot ? new Date(u.bewaren_tot).toLocaleDateString("nl-NL") : "na afronding vastgesteld"}</dd></div>
        </dl>

        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">Toestemming</p>
          {t?.deelname ? (
            <ul className="mt-1 space-y-0.5 text-slate-700">
              <li>{t.naam_vermelden ? "✓ Naam en organisatie mogen genoemd worden" : "✗ Naam en organisatie niet noemen (anoniem verwerken)"}</li>
              <li>{t.citeren ? "✓ Letterlijk citeren mag" : "✗ Niet letterlijk citeren, alleen in eigen woorden"}</li>
              <li>{t.ai ? "✓ AI-samenvatting mag" : "✗ Geen AI-verwerking"}</li>
              <li className="text-xs text-slate-500">Gegeven op {datumTijd(t.gegeven_op)}</li>
            </ul>
          ) : (
            <p className="mt-1 text-slate-500">Nog niet gegeven. De respondent kiest dit bij de start van het interview.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="font-semibold text-slate-900">Link en status</p>
        <p className="mt-1 text-sm text-slate-500">
          {heeftLink ? "Er is een actieve persoonlijke link." : "Er is geen actieve link."} Om veiligheidsredenen wordt een link maar één keer getoond.
          Een nieuwe link maken schakelt de oude uit.
        </p>
        {token && <LinkTonen id={u.id} token={token} email={u.email} />}
        <div className="mt-3 flex flex-wrap gap-2">
          <BevestigKnop vraag={heeftLink ? "De oude link werkt dan niet meer. Doorgaan?" : "Link maken?"} bevestig="Ja, nieuwe link" onBevestig={nieuweLink} className={knop}>
            {heeftLink ? "Nieuwe link maken" : "Link maken"}
          </BevestigKnop>
          {heeftLink && (
            <BevestigKnop vraag="Link intrekken? De respondent kan dan niet meer verder." bevestig="Ja, intrekken" onBevestig={() => actie(() => supabase.rpc("pws_iv_link_intrekken", { p_id: u.id }), "Link ingetrokken.")} className={knop}>
              Link intrekken
            </BevestigKnop>
          )}
          {(u.status === "afgerond" || u.status === "gesloten") && (
            <button className={knop} onClick={() => actie(() => supabase.from("pws_iv_uitnodigingen").update({ status: t?.deelname ? "gestart" : "uitgenodigd", afgerond_op: null }).eq("id", u.id), "Interview is weer opengesteld; de respondent kan antwoorden aanpassen.")}>
              Opnieuw openstellen
            </button>
          )}
          {u.status !== "gesloten" && u.status !== "afgerond" && (
            <BevestigKnop vraag="Interview sluiten? De respondent kan niets meer invullen." bevestig="Ja, sluiten" onBevestig={() => actie(() => supabase.from("pws_iv_uitnodigingen").update({ status: "gesloten" }).eq("id", u.id), "Interview gesloten.")} className={knop}>
              Sluiten
            </BevestigKnop>
          )}
          {!heeftAntwoorden && u.type_id && (
            <button className={knop} onClick={() => actie(() => supabase.rpc("pws_iv_vragen_vernieuwen", { p_id: u.id }), "Vragen bijgewerkt naar de huidige versie van het interviewtype.")}>
              Vragen bijwerken
            </button>
          )}
        </div>
        {melding && <p role="status" className="mt-2 text-sm text-slate-700">{melding}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">Antwoorden</p>
          <div className="flex flex-wrap gap-2">
            <a className={knop} href={`/api/interviews/export?formaat=pdf&ids=${u.id}`}>PDF</a>
            <a className={knop} href={`/api/interviews/export?formaat=docx&ids=${u.id}`}>Word</a>
          </div>
        </div>
        {u.boodschap && <p className="mt-2 text-sm text-slate-500">Persoonlijke boodschap: “{u.boodschap}”</p>}
        <ol className="mt-3 space-y-4">
          {u.vragen.map((v, i) => {
            const a = antw.get(v.key);
            return (
              <li key={v.key}>
                <p className="font-medium text-slate-900">{i + 1}. {v.tekst}</p>
                {u.taal === "en" && v.tekst_en && <p className="text-sm text-slate-500">Gesteld als: {v.tekst_en}</p>}
                <div className="mt-1 flex flex-wrap gap-1">
                  {v.algemeen && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">algemeen</span>}
                  {v.themas.map((k) => (
                    <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{themaNaam.get(k) ?? k}</span>
                  ))}
                </div>
                {a?.antwoord.trim() ? (
                  <p className="mt-1.5 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-slate-800">{a.antwoord}</p>
                ) : (
                  <p className="mt-1.5 text-sm italic text-slate-400">Nog niet beantwoord</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="font-semibold text-slate-900">Beheer</p>
        {bewerk ? (
          <form onSubmit={opslaanGegevens} className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["naam", "email", "functie", "organisatie"] as const).map((k) => (
              <label key={k} className="text-sm capitalize text-slate-600">
                {k === "email" ? "E-mailadres" : k}
                <input value={g[k]} onChange={(e) => setG({ ...g, [k]: e.target.value })} className={veld} maxLength={k === "email" ? 320 : 200} />
              </label>
            ))}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Opslaan</button>
              <button type="button" onClick={() => setBewerk(false)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Annuleren</button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={knop} onClick={() => setBewerk(true)}>Gegevens aanpassen</button>
            <button className={knop} onClick={() => actie(() => supabase.from("pws_iv_uitnodigingen").update({ gearchiveerd: !u.gearchiveerd }).eq("id", u.id), u.gearchiveerd ? "Uit het archief gehaald." : "Gearchiveerd. De link werkt niet meer zolang het interview in het archief staat.")}>
              {u.gearchiveerd ? "Uit archief halen" : "Archiveren"}
            </button>
            <BevestigKnop
              vraag="Dit interview met alle antwoorden en persoonsgegevens definitief verwijderen?"
              onBevestig={async () => {
                const { error } = await supabase.from("pws_iv_uitnodigingen").delete().eq("id", u.id);
                if (error) return setMelding("Verwijderen lukte niet.");
                router.push("/interviews");
                router.refresh();
              }}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Interview verwijderen
            </BevestigKnop>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">Verwijderen is bedoeld voor verzoeken van de respondent en voor het opruimen na de bewaartermijn.</p>
      </section>
    </div>
  );
}
