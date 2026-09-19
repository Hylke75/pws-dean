"use client";

import { useEffect } from "react";

/**
 * Waarschuwt de gebruiker als die de pagina verlaat terwijl er nog niet-opgeslagen
 * wijzigingen zijn. Gebruikt bij velden die pas op `onBlur` automatisch opslaan.
 */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
