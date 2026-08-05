"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  // Starts undefined until mounted, so we never render a toggle that
  // contradicts the class the no-FOUC script already applied.
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // One-time read of the class the no-FOUC script (theme-script.tsx)
    // already applied before hydration — not a cascading state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  if (isDark === null) {
    return <div className="size-11" aria-hidden="true" />;
  }

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("pitstop-theme", next ? "dark" : "light");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="size-11"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
