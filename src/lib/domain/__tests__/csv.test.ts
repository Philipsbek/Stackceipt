import { describe, expect, it } from "vitest";
import { csvMoney, escapeCsvCell, toCsv } from "../csv";

describe("escapeCsvCell", () => {
  it("neutralizes formula-injection prefixes", () => {
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+cmd")).toBe("'+cmd");
    expect(escapeCsvCell("-2")).toBe("'-2");
    expect(escapeCsvCell("@SUM")).toBe("'@SUM");
  });
  it("quotes and escapes commas, quotes and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('he said "hi"')).toBe('"he said ""hi"""');
  });
  it("leaves safe values untouched", () => {
    expect(escapeCsvCell("Acme Corp")).toBe("Acme Corp");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(null)).toBe("");
  });
  it("handles a dangerous value that also needs quoting", () => {
    expect(escapeCsvCell("=1,2")).toBe('"\'=1,2"');
  });
});

describe("csvMoney", () => {
  it("renders exact major.minor from integer minor units", () => {
    expect(csvMoney(123456)).toBe("1234.56");
    expect(csvMoney(5)).toBe("0.05");
    expect(csvMoney(100)).toBe("1.00");
    expect(csvMoney(-2599)).toBe("-25.99");
  });
});

describe("toCsv", () => {
  it("builds a CRLF-delimited document", () => {
    const csv = toCsv(["Vendor", "Amount"], [["Acme", csvMoney(120000)]]);
    expect(csv).toBe("Vendor,Amount\r\nAcme,1200.00");
  });
});
