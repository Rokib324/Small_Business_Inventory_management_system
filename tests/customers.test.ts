import { describe, it, expect } from "vitest";
import { customerSchema } from "@/features/customers/schemas";
import { toPoisha, fromPoisha } from "@/lib/money";

describe("Customer Schemas & Due Conversion", () => {
  it("validates valid customer input with opening due", () => {
    const valid = {
      name: "মো: রফিকুল ইসলাম",
      phone: "01712345678",
      address: "দোকান নং ১২, ঢাকা",
      openingDueTaka: 5000,
    };

    const result = customerSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(toPoisha(result.data.openingDueTaka)).toBe(500000);
      expect(fromPoisha(toPoisha(result.data.openingDueTaka))).toBe(5000);
    }
  });

  it("accepts customer without phone or opening due", () => {
    const minimal = {
      name: "রহিম ভাই",
      phone: "",
      address: "",
      openingDueTaka: 0,
    };

    const result = customerSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects invalid customer with empty name or negative due", () => {
    const invalid = {
      name: "A", // too short
      openingDueTaka: -100,
    };

    const result = customerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
