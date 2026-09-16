"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overzicht" },
  { href: "/logboek", label: "Logboek" },
  { href: "/bronnen", label: "Bronnen" },
  { href: "/enquetes", label: "Enquête" },
  { href: "/verslag", label: "Verslag" },
];

export default function NavLinks({ isBegeleider }: { isBegeleider: boolean }) {
  const path = usePathname();
  const links = isBegeleider ? [...LINKS, { href: "/admin", label: "Planning beheren" }] : LINKS;

  return (
    <nav className="flex flex-nowrap gap-1">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
