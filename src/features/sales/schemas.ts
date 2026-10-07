import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const createSaleSchema = z.object({
  customerId: z.string().nullable().optional(),
  clientId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "পণ্য নির্বাচন করুন"),
        quantity: z
          .number({ message: "পরিমাণ সঠিক সংখ্যা হতে হবে" })
          .int("পরিমাণ পূর্ণসংখ্যা হতে হবে")
          .min(1, "পরিমাণ কমপক্ষে ১ হতে হবে"),
        unitPriceTaka: z
          .number({ message: "দর সঠিক সংখ্যা হতে হবে" })
          .min(0, "দর ঋণাত্মক হতে পারে না"),
      })
    )
    .min(1, "চালানে কমপক্ষে ১টি পণ্য যুক্ত করুন"),
  discountTaka: z
    .number({ message: "ছাড় সঠিক সংখ্যা হতে হবে" })
    .min(0, "ছাড় ঋণাত্মক হতে পারে না")
    .default(0),
  paidTaka: z
    .number({ message: "পরিশোধের পরিমাণ সঠিক সংখ্যা হতে হবে" })
    .min(0, "পরিশোধের পরিমাণ ঋণাত্মক হতে পারে না")
    .default(0),
  paymentMethod: z
    .nativeEnum(PaymentMethod, {
      message: "সঠিক পেমেন্ট মাধ্যম নির্বাচন করুন",
    })
    .default(PaymentMethod.CASH),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type CreateSaleFormInput = z.infer<typeof createSaleSchema>;
