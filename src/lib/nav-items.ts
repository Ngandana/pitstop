import { Bike, Home, Settings, Users, Wallet } from "lucide-react";

/**
 * Primary navigation — bottom nav on mobile, sidebar on desktop.
 * Capped at 5 items per §6 ("max 5 items" on mobile bottom nav).
 */
export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: Home },
  { href: "/fleet", label: "Fleet", icon: Bike },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/ledger", label: "Ledger", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
