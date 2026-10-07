import { describe, it, expect } from "vitest";
import { supplierSchema } from "@/features/suppliers/schemas";
import { toPoisha, fromPoisha } from "@/lib/money";

describe("Supplier Schemas & Payable Conversion", () => {
  it("validates valid supplier input with opening payable", () => {
    const valid = {
      name: "মেসার্স কবির স্টিল মিলস",
      companyName: "কবির স্টিল",
      phone: "01811223344",
      address: "টঙ্গী শিল্প এলাকা, গাজীপুর",
      openingPayableTaka: 45000,
    };

    const result = supplierSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toPoisha(result.data.openingPayableTaka)).toBe(4500000);
      expect(fromPoisha(toPoisha(result.data.openingPayableTaka))).toBe(45000);
    }
  });

  it("accepts supplier with minimal fields", () => {
    const minimal = {
      name: "আবুল কালাম",
      openingPayableTaka: 0,
    };

    const result = supplierSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects invalid supplier with short name or negative payable", () => {
    const invalid = {
      name: "A",
      openingPayableTaka: -500,
    };

    const result = supplierSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
