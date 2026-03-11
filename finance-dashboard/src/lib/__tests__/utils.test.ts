import { describe, it, expect } from "vitest";
import {
  formatKRW,
  formatUSD,
  formatVND,
  formatCompactKRW,
  formatCompactUSD,
  formatPercent,
  formatNumber,
  parseNumber,
} from "../utils";

describe("parseNumber", () => {
  it("parses plain numbers", () => {
    expect(parseNumber("1234")).toBe(1234);
    expect(parseNumber("0")).toBe(0);
  });

  it("parses negative numbers", () => {
    expect(parseNumber("-500")).toBe(-500);
  });

  it("strips KRW formatting (₩, commas)", () => {
    expect(parseNumber("₩1,234,567")).toBe(1234567);
  });

  it("strips currency symbols and commas", () => {
    expect(parseNumber("$12,345.67")).toBe(12345.67);
  });

  it("returns 0 for empty/invalid strings", () => {
    expect(parseNumber("")).toBe(0);
    expect(parseNumber("abc")).toBe(0);
    expect(parseNumber("N/A")).toBe(0);
  });

  it("handles decimal numbers", () => {
    expect(parseNumber("1,450.5")).toBe(1450.5);
  });
});

describe("formatCompactKRW", () => {
  it("formats billions as 억", () => {
    expect(formatCompactKRW(1_500_000_000)).toBe("15.0억");
  });

  it("formats ten-thousands as 만", () => {
    expect(formatCompactKRW(50_000)).toBe("5만");
    expect(formatCompactKRW(1_230_000)).toBe("123만");
  });

  it("formats small numbers as-is", () => {
    expect(formatCompactKRW(9999)).toBe("9,999");
  });
});

describe("formatCompactUSD", () => {
  it("formats millions", () => {
    expect(formatCompactUSD(1_500_000)).toBe("$1.5M");
  });

  it("formats thousands", () => {
    expect(formatCompactUSD(50_000)).toBe("$50K");
  });

  it("formats small numbers", () => {
    expect(formatCompactUSD(999)).toBe("$999");
  });
});

describe("formatPercent", () => {
  it("formats decimal as percentage", () => {
    expect(formatPercent(0.856)).toBe("85.6%");
    expect(formatPercent(1)).toBe("100.0%");
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatNumber", () => {
  it("adds thousand separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatKRW", () => {
  it("formats as Korean Won", () => {
    const result = formatKRW(1500000);
    expect(result).toContain("1,500,000");
  });
});

describe("formatUSD", () => {
  it("formats as US Dollar", () => {
    const result = formatUSD(1500);
    expect(result).toContain("1,500");
  });
});

describe("formatVND", () => {
  it("formats as Vietnamese Dong", () => {
    const result = formatVND(25000000);
    // VND formatting varies by locale, just check it doesn't throw
    expect(result).toBeTruthy();
  });
});
