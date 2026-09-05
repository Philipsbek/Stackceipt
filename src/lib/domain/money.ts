import type { BillingCadence } from "./enums";

/**
 * Money model.
 *
 * Rules (see master spec §9):
 *  - Amounts are integer MINOR units (cents), stored as bigint in Postgres.
 *    In TypeScript we operate on `number` but guard the JS safe-integer range.
 *  - `amount_minor` means "the amount charged once per stated billing cadence".
 *  - V1 is single-currency per organization; combined totals must share a currency.
 *  - Custom cadence uses a deterministic rounding policy: multiply before divide,
 *    round half-up to the nearest minor unit.
 */

export const MAX_SAFE_MINOR = Number.MAX_SAFE_INTEGER;

export type Cadence = BillingCadence;

/** Number of times a recurring cadence is charged per year. `null` = not recurring. */
export function chargesPerYear(
  cadence: Cadence,
  intervalMonths?: number | null,
): number | null {
  switch (cadence) {
    case "MONTHLY":
      return 12;
    case "QUARTERLY":
      return 4;
    case "ANNUAL":
      return 1;
    case "CUSTOM": {
      if (!intervalMonths || intervalMonths <= 0) return null;
      return 12 / intervalMonths;
    }
    case "ONE_TIME":
      return null;
    default:
      return null;
  }
}

export function isRecurring(cadence: Cadence): boolean {
  return cadence !== "ONE_TIME";
}

/** Round half-up on a real number to the nearest integer minor unit. */
function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

function assertSafe(value: number, context: string): void {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_SAFE_MINOR) {
    throw new RangeError(
      `Monetary value out of safe integer range in ${context}: ${value}`,
    );
  }
}

/**
 * Annualized (annual committed) cost in minor units for a recurring charge.
 * Returns 0 for one-time or invalid custom cadence (excluded from recurring totals).
 *
 *  Monthly:   amount × 12
 *  Quarterly: amount × 4
 *  Annual:    amount
 *  Custom:    amount × 12 ÷ intervalMonths  (multiply before divide, round half-up)
 */
export function annualizedMinor(
  amountMinor: number,
  cadence: Cadence,
  intervalMonths?: number | null,
): number {
  if (!isRecurring(cadence)) return 0;
  assertSafe(amountMinor, "annualizedMinor.input");

  switch (cadence) {
    case "MONTHLY":
      return safeMul(amountMinor, 12);
    case "QUARTERLY":
      return safeMul(amountMinor, 4);
    case "ANNUAL":
      return amountMinor;
    case "CUSTOM": {
      if (!intervalMonths || intervalMonths <= 0) return 0;
      const numerator = safeMul(amountMinor, 12);
      const result = roundHalfUp(numerator / intervalMonths);
      assertSafe(result, "annualizedMinor.custom");
      return result;
    }
    default:
      return 0;
  }
}

/**
 * Normalized monthly recurring cost in minor units.
 * Derived from the annualized figure using the same rounding policy so the two
 * labels always agree: monthly = round(annualized / 12).
 */
export function monthlyMinor(
  amountMinor: number,
  cadence: Cadence,
  intervalMonths?: number | null,
): number {
  if (!isRecurring(cadence)) return 0;
  const annual = annualizedMinor(amountMinor, cadence, intervalMonths);
  return roundHalfUp(annual / 12);
}

function safeMul(a: number, b: number): number {
  const result = a * b;
  assertSafe(result, "safeMul");
  return result;
}

/** Sum a list of minor-unit values, guarding the safe range. */
export function sumMinor(values: number[]): number {
  let total = 0;
  for (const v of values) {
    total += v;
    assertSafe(total, "sumMinor");
  }
  return total;
}

/**
 * Format a minor-unit amount as a localized currency string.
 * Uses Intl.NumberFormat; falls back gracefully for unknown currencies.
 */
// Currencies whose ISO code renders without a recognizable local symbol in the
// en-US locale (e.g. MYR → "MYR"), so we prefer the narrow symbol (→ "RM").
const NARROW_SYMBOL_CURRENCIES = new Set(["MYR"]);

function currencyDisplayFor(code: string): "symbol" | "narrowSymbol" {
  return NARROW_SYMBOL_CURRENCIES.has(code) ? "narrowSymbol" : "symbol";
}

export function formatMoney(
  amountMinor: number,
  currency: string,
  options?: { locale?: string; showCents?: boolean },
): string {
  const locale = options?.locale ?? "en-US";
  const code = currency.toUpperCase();
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: currencyDisplayFor(code),
      minimumFractionDigits: options?.showCents === false ? 0 : 2,
      maximumFractionDigits: options?.showCents === false ? 0 : 2,
    }).format(major);
  } catch {
    // Unknown/invalid currency code — degrade to a readable form.
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}

/** Compact currency formatting for dense metric tiles (e.g. $12.4K). */
export function formatMoneyCompact(
  amountMinor: number,
  currency: string,
  locale = "en-US",
): string {
  const code = currency.toUpperCase();
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: currencyDisplayFor(code),
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(0)}`;
  }
}
