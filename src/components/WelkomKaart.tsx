"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

export default function WelkomKaart({ role }: { role: Role }) {
  const [zichtbaar, setZichtbaar] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("pws_welkom_weg")) setZichtbaar(true);
  }, []);

  if (!zichtbaar) return null;

  const isOuder = role !== "student";

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-emerald-900">
            {isOuder ? "Welkom! Zo helpt deze tool jullie mee" : "Welkom bij je PWS-tracker 👋"}
          </p>
          {isOuder ? (
            <ul className="mt-2 space-y-1 text-sm text-emerald-900">
              <li>• Je volgt Deans voortgang, planning en logboek op één plek.</li>
              <li>• Als hij een fase indient, zie je die bij <strong>&quot;Te beoordelen&quot;</strong> en krijg je een mail — je kunt dan feedback geven.</li>
              <li>• Onder <strong>Planning beheren</strong> kun je deadlines aanpassen; Dean krijgt daar automatisch bericht van.</li>
              <li>• Je krijgt reminders 2 en 1 dag vóór elke deadline.</li>
            </ul>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-emerald-900">
              <li>• Werk je PWS fase voor fase uit — elke fase heeft invulvelden en een <strong>&quot;zo pak je dit aan&quot;</strong>-hulp.</li>
              <li>• Houd je uren bij in het <strong>Logboek</strong>, verzamel je <strong>Bronnen</strong>, en maak zo nodig een <strong>Enquête</strong> of <strong>Interview</strong>.</li>
              <li>• Met <strong>Controleer mijn werk</strong> check je een fase tegen de eisen; met <strong>Indienen</strong> vraag je feedback aan je ouders.</li>
              <li>• Onder <strong>Verslag</strong> bouw je het eindverslag op en exporteer je alles naar Word.</li>
            </ul>
          )}
        </div>
        <button
          onClick={() => { localStorage.setItem("pws_welkom_weg", "1"); setZichtbaar(false); }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Sluiten ✕
        </button>
      </div>
    </div>
  );
}
