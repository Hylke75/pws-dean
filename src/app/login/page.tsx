"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white text-xl font-bold shadow-sm">
            P
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">PWS-tracker</h1>
          <p className="mt-1 text-sm text-slate-500">
            Alles voor je profielwerkstuk op één plek.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {status === "sent" ? (
            <div className="text-center">
              <div className="text-3xl mb-2">📬</div>
              <p className="text-slate-800 font-medium">Check je mail</p>
              <p className="mt-1 text-sm text-slate-500">
                We stuurden een inloglink naar <strong>{email}</strong>. Klik erop om in te
                loggen.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mailadres
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.nl"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {status === "sending" ? "Versturen…" : "Stuur inloglink"}
              </button>
              {status === "error" && (
                <p className="text-sm text-red-600">{msg}</p>
              )}
              <p className="text-center text-xs text-slate-400">
                Je krijgt een magische inloglink — geen wachtwoord nodig.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
