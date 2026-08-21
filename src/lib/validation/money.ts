import { z } from "zod";

export const PAYMENT_METHODS = [
  "cash",
  "eft",
  "payshap",
  "capitec_pay",
  "instant_eft",
  "other",
] as const;

export const recordPaymentSchema = z.object({
  driverId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  amountRands: z.coerce.number().positive("Amount must be more than R0"),
  method: z.enum(PAYMENT_METHODS),
  reference: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

export const waiveRentChargeSchema = z.object({
  chargeId: z.string().uuid(),
  waivedRands: z.coerce.number().nonnegative(),
  waiveReason: z.string().trim().min(1, "A reason is required").max(500),
});

export const voidPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  voidReason: z.string().trim().min(1, "A reason is required").max(500),
});
