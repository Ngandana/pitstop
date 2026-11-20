"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

/** Registers the service worker and offers an "Install app" button where the browser supports it. */
export function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!installEvent) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await installEvent.prompt();
        setInstallEvent(null);
      }}
      className="fixed bottom-20 right-4 z-50 cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg md:bottom-4"
    >
      Install app
    </button>
  );
}
