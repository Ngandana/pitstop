/**
 * Provider abstraction for pulling a bike's current odometer reading from
 * a telematics vendor. Cartrack today; §5 wants this swappable, so the
 * nightly sync (src/app/api/cron/mileage-sync/route.ts) only ever talks
 * to this interface, never to Cartrack's client directly.
 */
export type OdometerFetchResult =
  | {
      ok: true;
      km: number;
      recordedAt: Date;
      /**
       * Identifier of the physical tracker that produced this reading, when
       * the provider exposes one. A swapped tracker restarts its odometer
       * from ~0, which reads as a backwards jump; sync.ts uses this to tell
       * that apart from a genuine bad reading. Null when unknown.
       */
      deviceId: string | null;
      raw: unknown;
    }
  | { ok: false; error: string; raw?: unknown };

export interface TelematicsProvider {
  readonly name: string;
  /** `vehicleId` is whatever the provider uses to identify a vehicle — for Cartrack, its registration. */
  fetchOdometerReading(vehicleId: string): Promise<OdometerFetchResult>;
}
