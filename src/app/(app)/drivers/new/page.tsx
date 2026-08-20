import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DriverForm } from "@/components/drivers/driver-form";
import { createDriver } from "../actions";

export const dynamic = "force-dynamic";

export default function NewDriverPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/drivers"
          className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Drivers
        </Link>
        <h1 className="mt-2 text-hero text-foreground">Add a driver</h1>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-surface-raised p-6">
        <DriverForm action={createDriver} submitLabel="Add driver" />
      </div>
    </div>
  );
}
