import Link from "next/link";
import { Plus } from "lucide-react";
import { listBikes } from "@/lib/queries/fleet";
import { getCurrentOrg } from "@/lib/queries/org";
import { FleetOverview } from "@/components/today/fleet-overview";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const org = await getCurrentOrg();
  const bikes = await listBikes(org.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-hero text-foreground">Fleet</h1>
        <Link
          href="/fleet/new"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors duration-150 hover:bg-accent/90"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add bike
        </Link>
      </header>

      <FleetOverview bikes={bikes} />
    </div>
  );
}
