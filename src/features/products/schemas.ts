import { z } from "zod";

export const productUnits = ["PCS", "KG", "FT", "BAG", "BOX", "LTR", "MTR"] as const;

export const productSchema = z.object({
  name: z
    .string()
    .min(2, "পণ্যের নাম কমপক্ষে ২ অক্ষরের হতে হবে")
    .max(150, "পণ্যের নাম ১৫০ অক্ষরের মধ্যে হতে হবে"),
  sku: z.string().max(50).optional().or(z.literal("")),
  unit: z.enum(productUnits, {
    message: "সঠিক একক (Unit) নির্বাচন করুন",
  }),
  // Buy price in Taka from UI input (converted to poisha on server)
  buyPriceTaka: z
    .number({ message: "ক্রয় মূল্য সঠিক সংখ্যা হতে হবে" })
    .min(0, "ক্রয় মূল্য ঋণাত্মক হতে পারে না"),
  // Sell price in Taka from UI input (converted to poisha on server)
  sellPriceTaka: z
    .number({ message: "বিক্রয় মূল্য সঠিক সংখ্যা হতে হবে" })
    .min(0, "বিক্রয় মূল্য ঋণাত্মক হতে পারে না"),
  initialStock: z
    .number({ message: "স্টক সঠিক সংখ্যা হতে হবে" })
    .int("স্টক পূর্ণসংখ্যা হতে হবে")
    .min(0, "স্টক ঋণাত্মক হতে পারে না")
    .default(0),
  lowStockThreshold: z
    .number({ message: "সতর্কতা লেভেল সঠিক সংখ্যা হতে হবে" })
    .int("সতর্কতা লেভেল পূর্ণসংখ্যা হতে হবে")
    .min(0, "সতর্কতা লেভেল ঋণাত্মক হতে পারে না")
    .default(5),
});

export type ProductFormInput = z.infer<typeof productSchema>;

export const editProductSchema = z.object({
  id: z.string().min(1, "পণ্য আইডি আবশ্যক"),
  name: z
    .string()
    .min(2, "পণ্যের নাম কমপক্ষে ২ অক্ষরের হতে হবে")
    .max(150, "পণ্যের নাম ১৫০ অক্ষরের মধ্যে হতে হবে"),
  sku: z.string().max(50).optional().or(z.literal("")),
  unit: z.enum(productUnits, {
    message: "সঠিক একক নির্বাচন করুন",
  }),
  buyPriceTaka: z
    .number({ message: "ক্রয় মূল্য সঠিক সংখ্যা হতে হবে" })
    .min(0, "ক্রয় মূল্য ঋণাত্মক হতে পারে না"),
  sellPriceTaka: z
    .number({ message: "বিক্রয় মূল্য সঠিক সংখ্যা হতে হবে" })
    .min(0, "বিক্রয় মূল্য ঋণাত্মক হতে পারে না"),
  lowStockThreshold: z
    .number({ message: "সতর্কতা লেভেল সঠিক সংখ্যা হতে হবে" })
    .int("সতর্কতা লেভেল পূর্ণসংখ্যা হতে হবে")
    .min(0, "সতর্কতা লেভেল ঋণাত্মক হতে পারে না"),
});

export type EditProductInput = z.infer<typeof editProductSchema>;

export const stockAdjustmentReasons = [
  "DAMAGE",
  "COUNT_CORRECTION",
  "EXPIRY",
  "RETURN_CUSTOMER",
  "RETURN_SUPPLIER",
  "OTHER",
] as const;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "পণ্য নির্বাচন করুন"),
  adjustmentType: z.enum(["INCREASE", "DECREASE"], {
    message: "সমন্বয়ের ধরন নির্বাচন করুন",
  }),
  quantity: z
    .number({ message: "সঠিক পরিমাণ লিখুন" })
    .int("পরিমাণ পূর্ণসংখ্যা হতে হবে")
    .positive("পরিমাণ ০ এর বেশি হতে হবে"),
  reason: z.enum(stockAdjustmentReasons, {
    message: "সঠিক কারণ নির্বাচন করুন",
  }),
  note: z.string().max(255).optional().or(z.literal("")),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
