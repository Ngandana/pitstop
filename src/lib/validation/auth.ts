import { z } from "zod";

export const magicLinkRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
});

export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;
