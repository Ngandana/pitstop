import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DriverForm } from "@/components/drivers/driver-form";
import { updateDriver } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditDriverPage({ params }: PageProps<"/drivers/[id]/edit">) {
  const { id } = await params;
  const driver = await db.query.drivers.findFirst({ where: eq(drivers.id, id) });
  if (!driver) notFound();

  const action = updateDriver.bind(null, driver.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/drivers/${driver.id}`}
          className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-150 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {driver.fullName}
        </Link>
        <h1 className="mt-2 text-hero text-foreground">Edit driver</h1>
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-surface-raised p-6">
        <DriverForm
          action={action}
          submitLabel="Save changes"
          defaults={{
            fullName: driver.fullName,
            phoneE164: driver.phoneE164,
            licenceNumber: driver.licenceNumber,
            licenceExpiresOn: driver.licenceExpiresOn,
            notes: driver.notes,
          }}
        />
      </div>
    </div>
  );
}
