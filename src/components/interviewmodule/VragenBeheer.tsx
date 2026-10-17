"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { IvThema, IvType, IvVraagBron } from "@/lib/interview";
import BevestigKnop from "@/components/BevestigKnop";
import VraagBewerker from "./VraagBewerker";

export default function VragenBeheer({
  types,
  algemeen,
  themas,
  aantal,
}: {
  types: IvType[];
  algemeen: IvVraagBron[];
  themas: IvThema[];
  aantal: Record<string, number>;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [fout, setFout] = useState("");

  async function nieuwType(e: React.FormEvent) {
    e.preventDefault();
    const n = naam.trim();
    if (!n) return;
    setFout("");
    const slug = `${n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
    const intro = types.find((t) => t.aanspreekvorm === "u")?.intro ?? null;
    const { data, error } = await supabase
      .from("pws_iv_types")
      .insert({ slug, naam: n, intro, status: "concept", order_index: types.length + 1 })
      .select("id")
      .single();
    if (error || !data) return setFout("Aanmaken lukte niet.");
    // Algemene vragen standaard toevoegen.
    await supabase.from("pws_iv_set").insert(algemeen.map((v, i) => ({ type_id: data.id, vraag_id: v.id, order_index: i })));
    router.push(`/interviews/vragen/${data.id}`);
  }

  async function nieuweAlgemene() {
    const key = `alg_${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await supabase.from("pws_iv_vragen").insert({ key, algemeen: true, tekst: "Nieuwe algemene vraag", themas: [] });
    if (error) return setFout("Toevoegen lukte niet.");
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Interviewtypen</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {types.map((t) => (
            <li key={t.id}>
              <Link
                href={`/interviews/vragen/${t.id}`}
                className={`block rounded-2xl border bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm ${t.gearchiveerd ? "border-dashed border-slate-300 opacity-60" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{t.naam}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "gepubliceerd" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {t.gearchiveerd ? "Gearchiveerd" : t.status === "gepubliceerd" ? "Gepubliceerd" : "Concept"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{aantal[t.id] ?? 0} vragen · {t.aanspreekvorm}-vorm</p>
              </Link>
            </li>
          ))}
        </ul>
        <form onSubmit={nieuwType} className="mt-3 flex flex-wrap gap-2">
          <input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Naam van een nieuw interviewtype…" aria-label="Naam nieuw interviewtype" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">+ Nieuw type</button>
        </form>
        {fout && <p className="mt-2 text-sm text-red-600">{fout}</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Algemene vragen</h2>
        <p className="mt-1 text-sm text-slate-500">
          Deze vragen staan in elk interview, zodat je antwoorden tussen doelgroepen kunt vergelijken. Een wijziging geldt voor nieuwe
          uitnodigingen van alle typen; verstuurde interviews houden hun eigen versie.
        </p>
        <div className="mt-3 space-y-3">
          {algemeen.map((v) => (
            <VraagBewerker key={v.id} vraag={v} themas={themas} metJeVorm>
              <BevestigKnop
                vraag="Uit gebruik nemen? De vraag verdwijnt uit nieuwe uitnodigingen van alle typen."
                bevestig="Ja"
                onBevestig={async () => {
                  await supabase.from("pws_iv_vragen").update({ actief: false }).eq("id", v.id);
                  router.refresh();
                }}
                className="text-sm text-slate-400 hover:text-red-600"
              >
                Uit gebruik nemen
              </BevestigKnop>
            </VraagBewerker>
          ))}
        </div>
        <button onClick={nieuweAlgemene} className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700">
          + Algemene vraag toevoegen
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Thema&apos;s voor de analyse</h2>
        <ul className="mt-3 space-y-2">
          {themas.map((t) => (
            <ThemaRij key={t.key} thema={t} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function ThemaRij({ thema }: { thema: IvThema }) {
  const supabase = createClient();
  const [naam, setNaam] = useState(thema.naam);
  const [opgeslagen, setOpgeslagen] = useState(false);
  return (
    <li className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="w-6 text-sm tabular-nums text-slate-400">{thema.order_index}.</span>
      <input
        value={naam}
        onChange={(e) => setNaam(e.target.value)}
        onBlur={async () => {
          if (naam.trim() && naam !== thema.naam) {
            await supabase.from("pws_iv_themas").update({ naam: naam.trim() }).eq("key", thema.key);
            setOpgeslagen(true);
            setTimeout(() => setOpgeslagen(false), 1500);
          }
        }}
        aria-label="Naam thema"
        className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-sm outline-none hover:border-slate-200 focus:border-emerald-500"
      />
      {opgeslagen && <span className="text-xs text-emerald-700">Opgeslagen</span>}
    </li>
  );
}
