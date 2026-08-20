import { db } from "@/db";

/**
 * v1 is single-tenant — there is exactly one organisation (§4). Every
 * write path still scopes by org_id so multi-tenancy is a later feature,
 * not a later migration, but there's only ever one row to find here.
 */
export async function getCurrentOrg() {
  const org = await db.query.organisations.findFirst();
  if (!org) {
    throw new Error(
      "No organisation exists yet. Sign in once first — it's created on first login.",
    );
  }
  return org;
}
