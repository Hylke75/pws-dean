"use client";

import { useState } from "react";

/**
 * Knop met bevestiging in de pagina zelf. Vervangt window.confirm(), dat in sommige
 * browsers (ingebouwde app-browsers, webapps op de telefoon) stil wordt onderdrukt.
 */
export default function BevestigKnop({
  children,
  vraag,
  bevestig = "Ja, verwijderen",
  onBevestig,
  className = "",
  ariaLabel,
  disabled,
}: {
  children: React.ReactNode;
  vraag: string;
  bevestig?: string;
  onBevestig: () => void | Promise<void>;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} disabled={disabled} aria-label={ariaLabel} className={className}>
        {children}
      </button>
    );
  }

  return (
    <span role="alertdialog" aria-label={vraag} className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-sm">
      <span className="text-red-800">{vraag}</span>
      <button
        type="button"
        autoFocus
        disabled={bezig}
        onClick={async () => {
          setBezig(true);
          try {
            await onBevestig();
          } finally {
            setBezig(false);
            setOpen(false);
          }
        }}
        className="rounded-md bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {bezig ? "Bezig…" : bevestig}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-slate-600 hover:bg-white">
        Annuleren
      </button>
    </span>
  );
}
