// Canonical currency list for the picker. Codes come from the runtime's own
// ISO 4217 set (Intl.supportedValuesOf) so it stays current with no dependency
// or bundled data; names come from Intl.DisplayNames. Common markets are
// ordered first, the rest alphabetically.

export interface CurrencyOption {
  code: string;
  name: string;
}

const COMMON = ["USD", "EUR", "GBP", "JPY", "CNY", "INR", "AUD", "CAD", "SGD", "MYR", "HKD", "CHF"];

// Fallback set if the runtime lacks Intl.supportedValuesOf (older engines).
const FALLBACK = [
  ...COMMON,
  "NZD", "ZAR", "AED", "SAR", "THB", "IDR", "PHP", "VND", "KRW", "TWD", "BRL",
  "MXN", "ARS", "CLP", "COP", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON",
  "TRY", "RUB", "UAH", "ILS", "EGP", "NGN", "KES", "PKR", "BDT", "LKR",
];

function supportedCurrencyCodes(): string[] {
  const withSupported = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    if (typeof withSupported.supportedValuesOf === "function") {
      const codes = withSupported.supportedValuesOf("currency");
      if (Array.isArray(codes) && codes.length) return codes;
    }
  } catch {
    // fall through
  }
  return FALLBACK;
}

function buildCurrencies(): CurrencyOption[] {
  const codes = supportedCurrencyCodes();
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "currency" });
  } catch {
    names = null;
  }

  const byCode = new Map<string, CurrencyOption>();
  for (const raw of codes) {
    const code = raw.toUpperCase();
    if (byCode.has(code)) continue;
    byCode.set(code, { code, name: names?.of(code) ?? code });
  }

  const commonFirst: CurrencyOption[] = [];
  for (const code of COMMON) {
    const opt = byCode.get(code);
    if (opt) {
      commonFirst.push(opt);
      byCode.delete(code);
    }
  }
  const rest = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  return [...commonFirst, ...rest];
}

/** All selectable currencies, common markets first then alphabetical. */
export const CURRENCY_OPTIONS: CurrencyOption[] = buildCurrencies();

/** How many of the leading options are "common" (for a divider in the UI). */
export const COMMON_CURRENCY_COUNT = CURRENCY_OPTIONS.filter((c) => COMMON.includes(c.code)).length;

export function currencyName(code: string): string {
  const upper = code.toUpperCase();
  return CURRENCY_OPTIONS.find((c) => c.code === upper)?.name ?? upper;
}

// Representative IANA timezone for a currency's primary market. The timezone
// follows the currency (it isn't chosen separately); unmapped currencies fall
// back to UTC.
const CURRENCY_TIMEZONE: Record<string, string> = {
  USD: "America/New_York", EUR: "Europe/Berlin", GBP: "Europe/London", JPY: "Asia/Tokyo",
  CNY: "Asia/Shanghai", INR: "Asia/Kolkata", AUD: "Australia/Sydney", CAD: "America/Toronto",
  SGD: "Asia/Singapore", MYR: "Asia/Kuala_Lumpur", HKD: "Asia/Hong_Kong", CHF: "Europe/Zurich",
  NZD: "Pacific/Auckland", ZAR: "Africa/Johannesburg", AED: "Asia/Dubai", SAR: "Asia/Riyadh",
  THB: "Asia/Bangkok", IDR: "Asia/Jakarta", PHP: "Asia/Manila", VND: "Asia/Ho_Chi_Minh",
  KRW: "Asia/Seoul", TWD: "Asia/Taipei", BRL: "America/Sao_Paulo", MXN: "America/Mexico_City",
  SEK: "Europe/Stockholm", NOK: "Europe/Oslo", DKK: "Europe/Copenhagen", PLN: "Europe/Warsaw",
  CZK: "Europe/Prague", HUF: "Europe/Budapest", RON: "Europe/Bucharest", TRY: "Europe/Istanbul",
  RUB: "Europe/Moscow", ILS: "Asia/Jerusalem", EGP: "Africa/Cairo", NGN: "Africa/Lagos",
  KES: "Africa/Nairobi", PKR: "Asia/Karachi", BDT: "Asia/Dhaka", LKR: "Asia/Colombo",
  ARS: "America/Argentina/Buenos_Aires", CLP: "America/Santiago", COP: "America/Bogota",
};

/** The timezone that follows a given currency (UTC if the currency isn't mapped). */
export function timezoneForCurrency(code: string): string {
  return CURRENCY_TIMEZONE[code.toUpperCase()] ?? "UTC";
}
