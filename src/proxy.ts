import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 renamed `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()`.
 * Runs on the Node.js runtime (not edge) and can't be configured otherwise
 * — see node_modules/next/dist/docs/.../upgrading/version-16.md.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // /api/* is excluded — those routes authenticate themselves (e.g. the
    // cron routes check a Bearer token) and must return JSON, never an
    // HTML redirect to /login. Caught live: without this, an unauthenticated
    // request to /api/cron/mileage-sync got a 307 to /login before the
    // route handler's own auth check ever ran.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
