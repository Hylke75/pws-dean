"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IV_STATUS_LABEL, IV_STATUS_STIJL, type IvStatus, type IvType } from "@/lib/interview";
import LinkTonen from "./LinkTonen";

export type OverzichtRij = {
  id: string;
  type_id: string | null;
  type_naam: string;
  naam: string;
  functie: string | null;
  organisatie: string | null;
  status: IvStatus;
  gearchiveerd: boolean;
  uitgenodigd_op: string | null;
  laatste_activiteit: string | null;
  afgerond_op: string | null;
  created_at: string;
};

const datum = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "–";

export default function InterviewOverzicht({ rijen, types }: { rijen: OverzichtRij[]; types: IvType[] }) {
  const [zoek, setZoek] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [archief, setArchief] = useState(false);
  const [nieuw, setNieuw] = useState(false);

  const zichtbaar = useMemo(() => {
    const z = zoek.trim().toLowerCase();
    return rijen.filter(
      (r) =>
        r.gearchiveerd === archief &&
        (!type || r.type_id === type) &&
        (!status || r.status === status) &&
        (!z || [r.naam, r.functie, r.organisatie, r.type_naam].some((x) => x?.toLowerCase().includes(z))),
    );
  }, [rijen, zoek, type, status, archief]);

  const tel = (s: IvStatus) => rijen.filter((r) => !r.gearchiveerd && r.status === s).length;

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["uitgenodigd", "gestart", "afgerond", "gesloten"] as IvStatus[]).map((s) => (
          <div key={s} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs text-slate-500">{IV_STATUS_LABEL[s]}</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{tel(s)}</p>
          </div>
        ))}
      </div>

      {nieuw ? (
        <NieuweUitnodiging types={types} onSluit={() => setNieuw(false)} />
      ) : (
        <button
          onClick={() => setNieuw(true)}
          className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 sm:w-auto"
        >
          + Nieuwe respondent uitnodigen
        </button>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
        <input
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op naam, functie of organisatie…"
          aria-label="Zoeken"
          className="min-w-0 flex-1 basis-56 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Interviewtype" className="min-w-0 rounded-lg border border-slate-200 px-2 py-2">
          <option value="">Alle typen</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.naam}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="rounded-lg border border-slate-200 px-2 py-2">
          <option value="">Alle statussen</option>
          {(Object.keys(IV_STATUS_LABEL) as IvStatus[]).map((s) => (
            <option key={s} value={s}>{IV_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-1 text-slate-600">
          <input type="checkbox" checked={archief} onChange={(e) => setArchief(e.target.checked)} className="accent-emerald-600" />
          Archief
        </label>
      </div>

      {zichtbaar.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          {rijen.length === 0 ? "Nog geen interviews. Nodig hierboven je eerste respondent uit." : "Geen interviews gevonden met deze filters."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="hidden bg-slate-50 text-xs uppercase tracking-wide text-slate-500 md:table-header-group">
              <tr>
                <th className="px-4 py-2 font-semibold">Respondent</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 font-semibold">Uitgenodigd</th>
                <th className="px-4 py-2 font-semibold">Laatste activiteit</th>
                <th className="px-4 py-2 font-semibold">Afgerond</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zichtbaar.map((r) => (
                <tr key={r.id} className="block md:table-row">
                  <td className="block px-4 pt-3 md:table-cell md:py-3">
                    <Link href={`/interviews/r/${r.id}`} className="font-medium text-slate-900 hover:text-emerald-700 hover:underline">
                      {r.naam}
                    </Link>
                    <p className="text-xs text-slate-500">{[r.functie, r.organisatie].filter(Boolean).join(" · ") || "–"}</p>
                  </td>
                  <td className="block px-4 text-slate-600 md:table-cell md:py-3">{r.type_naam}</td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{datum(r.uitgenodigd_op)}</td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{datum(r.laatste_activiteit)}</td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{datum(r.afgerond_op)}</td>
                  <td className="block px-4 pb-3 pt-1 md:table-cell md:py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${IV_STATUS_STIJL[r.status]}`}>{IV_STATUS_LABEL[r.status]}</span>
                    <span className="ml-2 text-xs text-slate-400 md:hidden">
                      {r.afgerond_op ? `afgerond ${datum(r.afgerond_op)}` : r.laatste_activiteit ? `actief ${datum(r.laatste_activiteit)}` : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NieuweUitnodiging({ types, onSluit }: { types: IvType[]; onSluit: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [v, setV] = useState({ naam: "", email: "", functie: "", organisatie: "", type: types[0]?.id ?? "", boodschap: "" });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [klaar, setKlaar] = useState<{ id: string; token: string } | null>(null);
  const zet = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  async function maak(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    if (!v.naam.trim()) return setFout("Vul een naam in.");
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return setFout("Dit e-mailadres klopt niet.");
    if (!v.type) return setFout("Kies een interviewtype.");
    setBezig(true);
    const { data: id, error } = await supabase.rpc("pws_iv_nieuwe_uitnodiging", {
      p_type_id: v.type, p_naam: v.naam, p_email: v.email, p_functie: v.functie, p_organisatie: v.organisatie, p_boodschap: v.boodschap,
    });
    if (error || !id) {
      setBezig(false);
      return setFout("Aanmaken lukte niet. Probeer het opnieuw.");
    }
    const { data: token } = await supabase.rpc("pws_iv_nieuwe_link", { p_id: id });
    setBezig(false);
    setKlaar({ id: id as string, token: token as string });
    router.refresh();
  }

  if (klaar) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-4">
        <p className="font-semibold text-slate-900">Uitnodiging voor {v.naam} is aangemaakt</p>
        <LinkTonen id={klaar.id} token={klaar.token} email={v.email.trim() || null} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/interviews/r/${klaar.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Naar dit interview
          </Link>
          <button onClick={onSluit} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">Sluiten</button>
        </div>
      </div>
    );
  }

  const veld = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500";
  return (
    <form onSubmit={maak} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-900">Nieuwe respondent uitnodigen</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">Naam *<input value={v.naam} onChange={zet("naam")} required maxLength={200} className={veld} /></label>
        <label className="text-sm text-slate-600">E-mailadres<input type="email" value={v.email} onChange={zet("email")} maxLength={320} className={veld} /></label>
        <label className="text-sm text-slate-600">Functie<input value={v.functie} onChange={zet("functie")} maxLength={200} className={veld} /></label>
        <label className="text-sm text-slate-600">Organisatie<input value={v.organisatie} onChange={zet("organisatie")} maxLength={200} className={veld} /></label>
      </div>
      <label className="block text-sm text-slate-600">
        Interviewtype *
        <select value={v.type} onChange={zet("type")} className={veld}>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.naam}{t.aanspreekvorm === "je" ? " (je-vorm)" : ""}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-slate-600">
        Persoonlijke boodschap (optioneel)
        <textarea value={v.boodschap} onChange={zet("boodschap")} rows={3} maxLength={2000} placeholder="Bijvoorbeeld: Leuk dat we elkaar spraken op de open dag…" className={veld} />
      </label>
      {fout && <p role="alert" className="text-sm text-red-600">{fout}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={bezig} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {bezig ? "Aanmaken…" : "Aanmaken en link maken"}
        </button>
        <button type="button" onClick={onSluit} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Annuleren</button>
      </div>
      <p className="text-xs text-slate-500">De vragen van het gekozen type worden vastgelegd bij deze uitnodiging. Latere wijzigingen in de vragen veranderen dit interview niet.</p>
    </form>
  );
}
