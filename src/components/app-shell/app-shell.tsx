import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";

export function AppShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string | null;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <Sidebar userEmail={userEmail} />
      <BottomNav />
      <main className="pb-20 md:ml-60 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
