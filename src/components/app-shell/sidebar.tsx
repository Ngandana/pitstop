"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav-items";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface-raised md:flex">
      <div className="flex h-16 items-center px-5">
        <span className="text-lg font-bold tracking-tight text-foreground">Pitstop</span>
      </div>

      <nav aria-label="Primary" className="flex-1 px-3 py-2">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-surface-sunken hover:text-foreground",
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-text-muted" title={userEmail ?? undefined}>
            {userEmail ?? "Not signed in"}
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-0.5 -mx-1 flex items-center gap-1.5 rounded px-1 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-150 hover:text-danger"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
