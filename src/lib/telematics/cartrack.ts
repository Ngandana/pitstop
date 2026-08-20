import "server-only";
import { formatCartrackTimestamp } from "./format-timestamp";
import type { OdometerFetchResult, TelematicsProvider } from "./types";

const REQUEST_TIMEOUT_MS = 15_000;
/**
 * Nightly cadence is 24h; a 48h lookback window gives one run's worth of
 * slack if the previous night's cron didn't fire, without paying for a
 * much bigger window than needed.
 */
const LOOKBACK_HOURS = 48;

/**
 * Shapes taken verbatim from the real Cartrack OpenAPI spec
 * (https://developer.cartrack.com/openapi/openapi.yaml, `Vehicle` and
 * `Trips` tags) — not guessed. Odometer values in both the
 * `/vehicles/{registration}/odometer` and `/trips` responses are in
 * **metres**, confirmed by cross-checking the spec's own worked examples
 * (start/end/distance values are only internally consistent as metres).
 */
type CartrackOdometerResponse = {
  data: {
    vehicle_id: number;
    registration: string;
    latest_event_ts: string | null;
    current_odometer_value: number | null;
    start_odometer_value: number | null;
    end_odometer_value: number | null;
    distance: number | null;
  } | null;
};

type CartrackTrip = {
  trip_id: number;
  end_timestamp: string | null;
  end_odometer: number | null;
};

type CartrackTripsResponse = {
  data: CartrackTrip[];
};

export class CartrackProvider implements TelematicsProvider {
  readonly name = "cartrack";

  constructor(
    private readonly config: {
      baseUrl: string;
      username: string;
      password: string;
    },
  ) {}

  private authHeader(): string {
    const token = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
      "base64",
    );
    return `Basic ${token}`;
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { Authorization: this.authHeader(), Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Cartrack API returned ${res.status}: ${body.slice(0, 300)}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchOdometerReading(registration: string): Promise<OdometerFetchResult> {
    const end = new Date();
    const start = new Date(end.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const params = {
      start_timestamp: formatCartrackTimestamp(start),
      end_timestamp: formatCartrackTimestamp(end),
    };

    let odometerResponse: CartrackOdometerResponse;
    try {
      odometerResponse = await this.request<CartrackOdometerResponse>(
        `/vehicles/${encodeURIComponent(registration)}/odometer`,
        params,
      );
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }

    const meters = odometerResponse.data?.current_odometer_value;
    if (typeof meters === "number") {
      return {
        ok: true,
        km: Math.round(meters / 1000),
        recordedAt: parseTimestamp(odometerResponse.data?.latest_event_ts) ?? end,
        raw: odometerResponse,
      };
    }

    // §5 fallback: odometer field not exposed -> sum/derive from trips.
    // We use the most recent trip's absolute end_odometer rather than
    // summing trip_distance deltas, since that doesn't need a known
    // starting baseline to add onto.
    try {
      const tripsResponse = await this.request<CartrackTripsResponse>(
        `/trips/${encodeURIComponent(registration)}`,
        params,
      );
      const latestWithOdometer = [...tripsResponse.data]
        .filter((t) => typeof t.end_odometer === "number")
        .sort((a, b) => (b.end_timestamp ?? "").localeCompare(a.end_timestamp ?? ""))[0];

      if (latestWithOdometer && typeof latestWithOdometer.end_odometer === "number") {
        return {
          ok: true,
          km: Math.round(latestWithOdometer.end_odometer / 1000),
          recordedAt: parseTimestamp(latestWithOdometer.end_timestamp) ?? end,
          raw: { odometerResponse, tripsResponse },
        };
      }

      return {
        ok: false,
        error: "No odometer data from Cartrack (odometer and trips both empty for this period).",
        raw: { odometerResponse, tripsResponse },
      };
    } catch (error) {
      return {
        ok: false,
        error: `Odometer unavailable; trips fallback also failed: ${error instanceof Error ? error.message : String(error)}`,
        raw: odometerResponse,
      };
    }
  }
}

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Reads CARTRACK_* env vars and builds the real client. Throws if unconfigured. */
export function createCartrackProviderFromEnv(): CartrackProvider {
  const baseUrl = process.env.CARTRACK_BASE_URL;
  const username = process.env.CARTRACK_USERNAME;
  const password = process.env.CARTRACK_PASSWORD;
  if (!baseUrl || !username || !password) {
    throw new Error(
      "CARTRACK_BASE_URL, CARTRACK_USERNAME, and CARTRACK_PASSWORD must all be set.",
    );
  }
  return new CartrackProvider({ baseUrl, username, password });
}
