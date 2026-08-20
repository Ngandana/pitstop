import { z } from "zod";
import { bikeStatusEnum } from "@/db/schema";

const currentYear = new Date().getFullYear();

export const bikeFormSchema = z.object({
  registration: z
    .string()
    .trim()
    .min(1, "Registration is required")
    .max(20, "Registration is too long")
    .transform((v) => v.toUpperCase()),
  make: z.string().trim().min(1, "Make is required").max(50),
  model: z.string().trim().min(1, "Model is required").max(50),
  engineCc: z.coerce
    .number()
    .int()
    .positive()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  year: z.coerce
    .number()
    .int()
    .min(1990)
    .max(currentYear + 1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  colour: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  vin: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  purchaseDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  // Rands in the form, converted to integer cents here.
  purchasePriceRands: z.coerce
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  cartrackVehicleId: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  // Only used on create — seeds the first odometer_readings row and the
  // starting point for auto-created service_schedules (§5).
  initialOdometerKm: z.coerce.number().int().nonnegative().max(500_000),
});

export type BikeFormInput = z.infer<typeof bikeFormSchema>;

export const manualOdometerSchema = z.object({
  readingKm: z.coerce.number().int().nonnegative().max(500_000),
});

export const bikeStatusChangeSchema = z.object({
  status: z.enum(bikeStatusEnum.enumValues),
  reason: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});
