"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordPage() {
  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [status, setStatus] = useState<"controleren" | "klaar" | "geen_sessie" | "bezig" | "gelukt" | "error">("controleren");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setStatus(user ? "klaar" : "geen_sessie");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (wachtwoord.length < 8) {
      setStatus("error");
      setMsg("Kies een wachtwoord van minstens 8 tekens.");
      return;
    }
    if (wachtwoord !== herhaal) {
      setStatus("error");
      setMsg("De twee wachtwoorden zijn niet gelijk.");
      return;
    }
    setStatus("bezig");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: wachtwoord });
    if (error) {
      setStatus("error");
      setMsg("Instellen mislukt. Open de link uit je e-mail opnieuw en probeer het nog eens.");
      return;
    }
    setStatus("gelukt");
    setMsg("Je nieuwe wachtwoord is opgeslagen.");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white text-xl font-bold shadow-sm">
            P
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Nieuw wachtwoord</h1>
          <p className="mt-1 text-sm text-slate-500">Stel een nieuw wachtwoord in voor je account.</p>
        </div>

        {status === "controleren" && <p className="text-center text-sm text-slate-500">Even geduld…</p>}

        {status === "geen_sessie" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            Deze pagina open je via de link in je e-mail. Vraag op de{" "}
            <a href="/login" className="font-medium text-emerald-700 hover:underline">inlogpagina</a> een nieuwe resetlink aan.
          </div>
        )}

        {(status === "klaar" || status === "bezig" || status === "error" || status === "gelukt") && (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nieuw wachtwoord</label>
              <input
                type="password"
                required
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                placeholder="minstens 8 tekens"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Herhaal wachtwoord</label>
              <input
                type="password"
                required
                value={herhaal}
                onChange={(e) => setHerhaal(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="submit"
              disabled={status === "bezig" || status === "gelukt"}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {status === "bezig" ? "Opslaan…" : "Wachtwoord opslaan"}
            </button>
            {status === "error" && <p role="alert" className="text-sm text-red-600">{msg}</p>}
            {status === "gelukt" && <p role="status" className="text-sm text-emerald-700">{msg}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
