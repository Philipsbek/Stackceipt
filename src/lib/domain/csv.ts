/**
 * CSV generation with spreadsheet formula-injection protection (spec §10.13, §14).
 *
 * A cell beginning with = + - @ TAB or CR can be interpreted as a formula by
 * Excel/Sheets. We prefix such values with a single quote and always quote/escape
 * fields. Integer-derived money values are written exactly (never floated).
 */

const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  if (DANGEROUS_PREFIX.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  // CRLF line endings for maximum spreadsheet compatibility.
  return lines.join("\r\n");
}

/** Money for CSV: exact major-unit string derived from integer minor units. */
export function csvMoney(amountMinor: number): string {
  const negative = amountMinor < 0;
  const abs = Math.abs(amountMinor);
  const major = Math.floor(abs / 100);
  const cents = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${major}.${cents}`;
}
