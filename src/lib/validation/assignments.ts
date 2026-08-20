import { z } from "zod";

export const assignmentFormSchema = z.object({
  bikeId: z.string().uuid("Choose a bike"),
  driverId: z.string().uuid("Choose a driver"),
  weeklyRentRands: z.coerce.number().positive("Weekly rent must be more than R0"),
  depositRands: z.coerce.number().nonnegative().default(0),
  startOdometerKm: z.coerce.number().int().nonnegative().max(500_000),
  rentDueWeekday: z.coerce.number().int().min(0).max(6).default(3),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export type AssignmentFormInput = z.infer<typeof assignmentFormSchema>;

export const HANDOVER_PHOTO_ANGLES = [
  "front",
  "rear",
  "left",
  "right",
  "odometer",
  "damage",
] as const;

export const endAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  endOdometerKm: z.coerce.number().int().nonnegative().max(500_000),
  endReason: z.string().trim().min(1, "A reason is required").max(500),
});

export type EndAssignmentInput = z.infer<typeof endAssignmentSchema>;
