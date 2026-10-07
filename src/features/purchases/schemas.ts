import { z } from "zod";

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1, { message: "পণ্য নির্বাচন করুন" }),
  quantity: z
    .number({ message: "সঠিক পরিমাণ লিখুন" })
    .int({ message: "পরিমাণ পূর্ণসংখ্যা হতে হবে" })
    .positive({ message: "পরিমাণ ০ এর বেশি হতে হবে" }),
  buyPriceTaka: z
    .number({ message: "সঠিক ক্রয়মূল্য লিখুন" })
    .min(0, { message: "ক্রয়মূল্য ০ বা তার বেশি হতে হবে" }),
});

export const createPurchaseSchema = z.object({
  clientId: z.string().optional(),
  supplierId: z.string().optional().nullable(),
  invoiceNumber: z.string().optional(),
  items: z
    .array(purchaseItemInputSchema)
    .min(1, { message: "কমপক্ষে একটি পণ্য যোগ করুন" }),
  paidTaka: z
    .number({ message: "পরিশোধের পরিমাণ লিখুন" })
    .min(0, { message: "পরিশোধের পরিমাণ ০ বা তার বেশি হতে হবে" })
    .default(0),
  paymentMethod: z
    .enum(["CASH", "BKASH", "NAGAD", "ROCKET", "UPAY", "BANK", "CHEQUE", "MIXED"])
    .default("CASH"),
  notes: z.string().optional().nullable(),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemInputSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
