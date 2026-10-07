import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const receivePaymentSchema = z.object({
  customerId: z.string().min(1, "কাস্টমার নির্বাচন করুন"),
  amountTaka: z
    .number({ message: "টাকার পরিমাণ সঠিক সংখ্যা হতে হবে" })
    .positive("টাকার পরিমাণ ০ এর বেশি হতে হবে"),
  method: z
    .nativeEnum(PaymentMethod, {
      message: "সঠিক পেমেন্ট মাধ্যম নির্বাচন করুন",
    })
    .default(PaymentMethod.CASH),
  reference: z.string().max(100).optional().or(z.literal("")),
  note: z.string().max(255).optional().or(z.literal("")),
});

export type ReceivePaymentInput = z.infer<typeof receivePaymentSchema>;
