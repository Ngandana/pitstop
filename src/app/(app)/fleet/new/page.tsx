import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BikeForm } from "@/components/fleet/bike-form";
import { createBike } from "../actions";

export const dynamic = "force-dynamic";

export default function NewBikePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/fleet"
          className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Fleet
        </Link>
        <h1 className="mt-2 text-hero text-foreground">Add a bike</h1>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-surface-raised p-6">
        <BikeForm action={createBike} mode="create" submitLabel="Add bike" />
      </div>
    </div>
  );
}
