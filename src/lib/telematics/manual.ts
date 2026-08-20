import type { OdometerFetchResult, TelematicsProvider } from "./types";

/**
 * The "manual" provider — for bikes with no cartrack_vehicle_id. It never
 * has anything to pull; readings come from the owner typing a number in
 * (a direct odometer_readings insert, not through this interface at all).
 * It exists so the sync job can treat every bike uniformly ("ask the
 * provider") without a special case, and so switching a bike between
 * providers later is just changing which one gets constructed.
 */
export class ManualProvider implements TelematicsProvider {
  readonly name = "manual";

  async fetchOdometerReading(): Promise<OdometerFetchResult> {
    return {
      ok: false,
      error: "Manual provider has no automated fetch — enter readings by hand.",
    };
  }
}
