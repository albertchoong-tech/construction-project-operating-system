"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ITEMS } from "@/components/nav";
import { canAccessModule, ROLE_LABELS, type Role } from "@/lib/roles";
import { signOut } from "@/lib/actions/auth";

function NavIcon({ d, className = "w-6 h-6" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const MORE_ICON =
  "M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z";

/** Mobile chrome: fixed top header with slide-out menu + fixed bottom tab bar.
 *  Hidden at lg+ where the desktop sidebar takes over. */
export function MobileNav({
  role,
  fullName,
  email,
}: {
  role: Role;
  fullName: string;
  email: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation and lock body scroll while open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const allowed = (href: string) =>
    canAccessModule(role, href === "/" ? "" : href.split("/")[1]);
  const items = NAV_ITEMS.filter((i) => allowed(i.href));

  // Bottom bar: up to 4 primary destinations + More
  const bottomItems = NAV_ITEMS.filter(
    // "Site Updates" replaces the separate Site Progress / Inspections tabs —
    // both remain reachable from the More menu and the desktop sidebar.
    (i) => ["/", "/projects", "/site-updates"].includes(i.href) && allowed(i.href),
  ).slice(0, 4);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="lg:hidden">
      {/* Top header */}
      <header className="fixed top-0 inset-x-0 h-14 bg-slate-900 text-white z-40 flex items-center justify-between pl-4 pr-1 shadow-md">
        <Link href="/" className="min-w-0">
          <span className="block text-base font-bold tracking-tight truncate">HSH ProjectOS</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="w-12 h-12 flex items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800 active:bg-slate-700"
        >
          <NavIcon d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </button>
      </header>

      {/* Slide-out menu */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/60"
          />
          <aside className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                <p className="text-xs text-slate-400 truncate">
                  {ROLE_LABELS[role]} · {email}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate-800 shrink-0"
              >
                <NavIcon d="M6 18L18 6M6 6l12 12" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 px-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium min-h-11 ${
                    isActive(item.href)
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <NavIcon d={item.icon} className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-slate-800 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={() => signOut()}
                className="w-full min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${bottomItems.length + 1}, 1fr)` }}>
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive(item.href) ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <NavIcon d={item.icon} className="w-6 h-6" />
              {item.href === "/site-updates" ? "Site" : item.label}
            </Link>
          ))}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-400 hover:text-slate-600"
            aria-label="More menu"
          >
            <NavIcon d={MORE_ICON} className="w-6 h-6" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
