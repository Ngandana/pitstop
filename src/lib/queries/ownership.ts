import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bikes, users } from "@/db/schema";

/** The bike, only if it belongs to `orgId` — the guard for every id that arrives from the browser. */
export async function findBikeInOrg(orgId: string, bikeId: string) {
  return db.query.bikes.findFirst({
    where: and(eq(bikes.id, bikeId), eq(bikes.orgId, orgId)),
  });
}

/**
 * The Cartrack credentials live in server env vars and belong to the
 * platform admin's own account. Only the admin's organisation may use them
 * — otherwise any other owner could type in a vehicle id and read the
 * admin's tracker data. Other owners enter mileage by hand until per-owner
 * credentials exist.
 */
export async function orgUsesPlatformCartrack(orgId: string): Promise<boolean> {
  const admin = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!admin) return false;
  const member = await db.query.users.findFirst({
    where: and(eq(users.orgId, orgId), eq(users.email, admin)),
    columns: { id: true },
  });
  return !!member;
}
