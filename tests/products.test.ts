import { describe, it, expect } from "vitest";
import { productSchema } from "@/features/products/schemas";
import { toPoisha, fromPoisha } from "@/lib/money";

describe("Product Schemas & Money Validation", () => {
  it("validates valid product input successfully", () => {
    const valid = {
      name: "১/২ ইঞ্চি জিআই পাইপ",
      sku: "GIP-05",
      unit: "PCS" as const,
      buyPriceTaka: 380,
      sellPriceTaka: 450,
      initialStock: 25,
      lowStockThreshold: 5,
    };

    const result = productSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toPoisha(result.data.buyPriceTaka)).toBe(38000);
      expect(toPoisha(result.data.sellPriceTaka)).toBe(45000);
      expect(fromPoisha(toPoisha(result.data.sellPriceTaka))).toBe(450);
    }
  });

  it("rejects invalid inputs like negative prices and empty name", () => {
    const invalid = {
      name: "A", // too short
      unit: "INVALID_UNIT",
      buyPriceTaka: -50,
      sellPriceTaka: 0,
      initialStock: -5,
      lowStockThreshold: -1,
    };

    const result = productSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
