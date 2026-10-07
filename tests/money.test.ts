import { describe, it, expect } from "vitest";
import {
  toPoisha,
  fromPoisha,
  formatMoney,
  formatMoneyBn,
  toBanglaDigits,
  formatSouthAsianNumber,
} from "@/lib/money";

describe("Money Utilities (Poisha Integer Math)", () => {
  it("converts Taka numbers and strings to poisha correctly without float errors", () => {
    expect(toPoisha(100)).toBe(10000);
    expect(toPoisha(100.5)).toBe(10050);
    expect(toPoisha(100.55)).toBe(10055);
    expect(toPoisha("100.55")).toBe(10055);
    expect(toPoisha("1,500.75")).toBe(150075);
    expect(toPoisha("0")).toBe(0);
    expect(toPoisha("")).toBe(0);
  });

  it("converts poisha to Taka float correctly", () => {
    expect(fromPoisha(10000)).toBe(100);
    expect(fromPoisha(10050)).toBe(100.5);
    expect(fromPoisha(10055)).toBe(100.55);
    expect(fromPoisha(0)).toBe(0);
  });

  it("formats poisha in English currency format", () => {
    expect(formatMoney(125000)).toBe("৳ 1,250.00");
    expect(formatMoney(125050)).toBe("৳ 1,250.50");
    expect(formatMoney(-50000)).toBe("-৳ 500.00");
    expect(formatMoney(0)).toBe("৳ 0.00");
    expect(formatMoney(125000, { showCurrencySymbol: false })).toBe("1,250.00");
    expect(formatMoney(125000, { showPoisha: false })).toBe("৳ 1,250");
  });

  it("converts English digits to Bangla numerals", () => {
    expect(toBanglaDigits("1234567890")).toBe("১২৩৪৫৬৭৮৯০");
    expect(toBanglaDigits("৳ 1,250.50")).toBe("৳ ১,২৫০.৫০");
  });

  it("formats poisha into Bangla currency representation (বাংলা রূপান্তর)", () => {
    expect(formatMoneyBn(125000)).toBe("৳ ১,২৫০");
    expect(formatMoneyBn(125050)).toBe("৳ ১,২৫০.৫০");
    expect(formatMoneyBn(-50000)).toBe("-৳ ৫০০");
    expect(formatMoneyBn(0)).toBe("৳ ০");
    expect(formatMoneyBn(125000, { alwaysShowPoisha: true })).toBe("৳ ১,২৫০.০০");
  });

  it("correctly formats large numbers using South Asian grouping (lakh / crore)", () => {
    expect(formatSouthAsianNumber(1000)).toBe("1,000");
    expect(formatSouthAsianNumber(100000)).toBe("1,00,000"); // 1 Lakh
    expect(formatSouthAsianNumber(10000000)).toBe("1,00,00,000"); // 1 Crore
    expect(formatMoneyBn(1000000000)).toBe("৳ ১,০০,০০,০০০"); // 1 Crore Taka in poisha
  });
});
