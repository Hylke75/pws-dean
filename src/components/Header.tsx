import Link from "next/link";
import NavLinks from "./NavLinks";
import NotificationBell from "./NotificationBell";
import SignOutButton from "./SignOutButton";
import type { Profile } from "@/lib/types";

export default function Header({ profile }: { profile: Profile }) {
  const isReviewer = profile.role !== "student";
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            P
          </span>
          <span className="hidden text-sm font-bold text-slate-900 sm:block">PWS-tracker</span>
        </Link>

        <div className="flex-1 overflow-x-auto">
          <NavLinks isBegeleider={isReviewer} />
        </div>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <div className="hidden sm:block">
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
