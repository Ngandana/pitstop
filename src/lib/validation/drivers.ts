import { z } from "zod";

// South African mobile numbers in E.164: +27 followed by 9 digits.
const E164_ZA = /^\+27\d{9}$/;

export const driverFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  phoneE164: z
    .string()
    .trim()
    .regex(E164_ZA, "Use E.164 format, e.g. +27821234567"),
  licenceNumber: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  licenceExpiresOn: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
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

export type DriverFormInput = z.infer<typeof driverFormSchema>;
