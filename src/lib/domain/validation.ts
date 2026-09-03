import { z } from "zod";
import { BILLING_CADENCES, SUBSCRIPTION_STATUSES } from "./enums";
import { isValidISODate } from "./dates";

/**
 * Shared domain validation. Used on the client form boundary and (when wired) on the
 * server action before any mutation. Money is entered in major units and converted to
 * integer minor units at the boundary.
 */

const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. USD");

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || isValidISODate(v), "Enter a valid date");

const majorAmount = z
  .number({ invalid_type_error: "Enter an amount" })
  .nonnegative("Amount cannot be negative")
  .finite();

export const subscriptionInputSchema = z
  .object({
    vendorName: z.string().trim().min(1, "Vendor is required").max(120),
    productName: z.string().trim().min(1, "Product is required").max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    category: z.string().trim().max(60).optional().nullable(),
    websiteUrl: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .optional()
      .nullable()
      .or(z.literal("")),
    status: z.enum(SUBSCRIPTION_STATUSES),
    departmentId: z.string().optional().nullable(),
    ownerMemberId: z.string().optional().nullable(),
    billingCadence: z.enum(BILLING_CADENCES),
    billingIntervalMonths: z
      .number()
      .int()
      .positive()
      .max(60)
      .optional()
      .nullable(),
    amountMajor: majorAmount,
    currency,
    startDate: optionalDate,
    nextRenewalDate: optionalDate,
    endDate: optionalDate,
    autoRenews: z.boolean(),
    noticePeriodDays: z.number().int().min(0).max(365),
    seatsPurchased: z.number().int().min(0).max(1_000_000).optional().nullable(),
    seatsUsed: z.number().int().min(0).max(1_000_000).optional().nullable(),
    contractReference: z.string().trim().max(120).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.billingCadence === "CUSTOM" && !val.billingIntervalMonths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["billingIntervalMonths"],
        message: "Custom cadence needs an interval in months",
      });
    }
    if (
      val.seatsPurchased != null &&
      val.seatsUsed != null &&
      val.seatsUsed > val.seatsPurchased
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seatsUsed"],
        message: "Used seats cannot exceed purchased seats",
      });
    }
    if (
      val.startDate &&
      val.endDate &&
      isValidISODate(val.startDate) &&
      isValidISODate(val.endDate) &&
      val.endDate < val.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date cannot be before the start date",
      });
    }
  });

export type SubscriptionInput = z.infer<typeof subscriptionInputSchema>;

export const requestInputSchema = z
  .object({
    vendorName: z.string().trim().min(1, "Vendor is required").max(120),
    productName: z.string().trim().min(1, "Product is required").max(120),
    businessJustification: z
      .string()
      .trim()
      .min(20, "Give at least a sentence of justification")
      .max(2000),
    departmentId: z.string().optional().nullable(),
    requestedSeats: z.number().int().min(0).max(1_000_000).optional().nullable(),
    amountMajor: majorAmount,
    currency,
    billingCadence: z.enum(BILLING_CADENCES),
    billingIntervalMonths: z.number().int().positive().max(60).optional().nullable(),
    neededBy: optionalDate,
  })
  .superRefine((val, ctx) => {
    if (val.billingCadence === "CUSTOM" && !val.billingIntervalMonths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["billingIntervalMonths"],
        message: "Custom cadence needs an interval in months",
      });
    }
  });

export type RequestInput = z.infer<typeof requestInputSchema>;

/** Convert a major-unit amount (e.g. 12.50) to integer minor units (1250). */
export function toMinor(major: number): number {
  return Math.round(major * 100);
}
