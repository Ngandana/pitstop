import { eq } from "drizzle-orm";
import type { db as Db } from "@/db";
import { bikeStatusHistory, bikes } from "@/db/schema";
import type { bikeStatusEnum } from "@/db/schema";

type BikeStatus = (typeof bikeStatusEnum.enumValues)[number];

/**
 * The only way a bike's status should ever change. Updates the current
 * value on `bikes` and appends a row to `bike_status_history` in the same
 * transaction — this is how downtime gets measured later, so a status
 * change that skips the history row is a bug, never a shortcut (§4).
 */
export async function changeBikeStatus(
  tx: Pick<typeof Db, "update" | "insert" | "query">,
  params: {
    bikeId: string;
    toStatus: BikeStatus;
    reason?: string | null;
    changedAt?: Date;
  },
) {
  const { bikeId, toStatus, reason = null, changedAt = new Date() } = params;

  const current = await tx.query.bikes.findFirst({ where: eq(bikes.id, bikeId) });
  if (!current) {
    throw new Error("Bike not found");
  }

  await tx.update(bikes).set({ status: toStatus, updatedAt: changedAt }).where(eq(bikes.id, bikeId));

  await tx.insert(bikeStatusHistory).values({
    bikeId,
    fromStatus: current.status,
    toStatus,
    reason,
    changedAt,
  });

  return { fromStatus: current.status, toStatus };
}
