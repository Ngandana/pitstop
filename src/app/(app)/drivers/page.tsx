import Link from "next/link";
import { Plus } from "lucide-react";
import { listDrivers } from "@/lib/queries/drivers";
import { getCurrentOrg } from "@/lib/queries/org";
import { DriverList } from "@/components/drivers/driver-list";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const org = await getCurrentOrg();
  const drivers = await listDrivers(org.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-hero text-foreground">Drivers</h1>
        <Link
          href="/drivers/new"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors duration-150 hover:bg-accent/90"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add driver
        </Link>
      </header>

      <DriverList drivers={drivers} />
    </div>
  );
}
