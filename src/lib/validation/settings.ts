import { z } from "zod";

/** §7 Settings: "service interval defaults" — the org-wide template new bikes' schedules are seeded from. */
export const updateServiceTypeSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(60),
  defaultIntervalKm: z.coerce.number().int().positive().max(50_000),
  defaultMaxIntervalDays: z.coerce.number().int().positive().max(3650),
});

/** §7 Settings: "rent policy defaults" — pre-fills /assignments/new, never required there. */
export const updateRentPolicySchema = z.object({
  weeklyRentRands: z.coerce
    .number()
    .positive()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  depositRands: z.coerce
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

/**
 * §7 Settings: "my notification preferences".
 *
 * emailRemindersEnabled takes a plain boolean, not a raw FormData value
 * — an unchecked HTML checkbox is simply absent from FormData (no
 * "false" string to coerce), so the caller must translate presence via
 * `formData.has(...)` before parsing. `z.coerce.boolean()` on an absent
 * key fails as "expected nonoptional, received undefined" rather than
 * coercing to false — caught live when unchecking the box threw instead
 * of saving.
 */
export const updateNotificationPreferencesSchema = z.object({
  notificationEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  emailRemindersEnabled: z.boolean(),
});
