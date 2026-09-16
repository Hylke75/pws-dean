import Link from "next/link";
import NavLinks from "./NavLinks";
import NotificationBell from "./NotificationBell";
import SignOutButton from "./SignOutButton";
import type { Profile } from "@/lib/types";

export default function Header({ profile }: { profile: Profile }) {
  const isReviewer = profile.role !== "student";
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              P
            </span>
            <span className="text-sm font-bold text-slate-900">PWS-tracker</span>
          </Link>

          {/* Nav inline op desktop */}
          <div className="hidden flex-1 justify-center md:flex">
            <NavLinks isBegeleider={isReviewer} />
          </div>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <SignOutButton />
          </div>
        </div>

        {/* Nav als scrollbare rij op mobiel */}
        <div className="-mx-1 overflow-x-auto pb-2 md:hidden">
          <NavLinks isBegeleider={isReviewer} />
        </div>
      </div>
    </header>
  );
}
