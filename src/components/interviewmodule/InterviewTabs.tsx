import Link from "next/link";

const TABS = [
  { href: "/interviews", key: "overzicht", label: "Overzicht" },
  { href: "/interviews/vragen", key: "vragen", label: "Vragen en typen" },
  { href: "/interviews/analyse", key: "analyse", label: "Analyse" },
  { href: "/enquetes/antwoorden", key: "antwoorden", label: "Antwoorden op onderzoeksvragen" },
  { href: "/interviews/export", key: "export", label: "Exporteren" },
  { href: "/interviews/instellingen", key: "instellingen", label: "Privacy en instellingen" },
] as const;

export type InterviewTab = (typeof TABS)[number]["key"];

export default function InterviewTabs({ actief }: { actief: InterviewTab }) {
  return (
    <nav aria-label="Interviewmodule" className="-mx-1 mt-4 overflow-x-auto">
      <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === actief ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              t.key === actief ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function GeenToegang() {
  return (
    <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
      Je hebt geen toegang tot de interviewmodule. Vraag Dean of de begeleider om je toe te voegen.
    </p>
  );
}
