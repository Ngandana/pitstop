import { z } from "zod";

export const logServiceSchema = z.object({
  serviceTypeId: z.string().uuid(),
  odometerKm: z.coerce.number().int().nonnegative().max(500_000),
  performedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  costRands: z.coerce
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  workshopName: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export const updateServiceScheduleSchema = z.object({
  intervalKm: z.coerce.number().int().positive().max(50_000),
  maxIntervalDays: z.coerce.number().int().positive().max(3650),
});
