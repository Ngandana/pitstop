/**
 * Cartrack's start_timestamp/end_timestamp query params want
 * `YYYY-MM-DD HH:MM:SS` (per the OpenAPI spec's examples — space
 * separated, no timezone suffix). Sent in UTC.
 */
export function formatCartrackTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}
