import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { bikes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BikeForm } from "@/components/fleet/bike-form";
import { updateBike } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditBikePage({ params }: PageProps<"/fleet/[id]/edit">) {
  const { id } = await params;
  const bike = await db.query.bikes.findFirst({ where: eq(bikes.id, id) });
  if (!bike) notFound();

  const action = updateBike.bind(null, bike.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/fleet/${bike.id}`}
          className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {bike.registration}
        </Link>
        <h1 className="mt-2 text-hero text-foreground">Edit bike</h1>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-surface-raised p-6">
        <BikeForm
          action={action}
          mode="edit"
          submitLabel="Save changes"
          defaults={{
            registration: bike.registration,
            make: bike.make,
            model: bike.model,
            engineCc: bike.engineCc,
            year: bike.year,
            colour: bike.colour,
            vin: bike.vin,
            purchaseDate: bike.purchaseDate,
            purchasePriceRands: bike.purchasePriceCents !== null ? bike.purchasePriceCents / 100 : null,
            cartrackVehicleId: bike.cartrackVehicleId,
          }}
        />
      </div>
    </div>
  );
}
