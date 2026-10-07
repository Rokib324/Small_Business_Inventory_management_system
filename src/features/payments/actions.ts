"use server";

import { getSessionTenantDb } from "@/lib/auth/session";
import { receivePaymentSchema, ReceivePaymentInput } from "./schemas";
import { toPoisha } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { LedgerEntryType, LedgerReferenceType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function receivePaymentAction(
  input: ReceivePaymentInput
): Promise<ActionResponse<{ paymentId: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Server-side Zod validation (Rule 7)
  const validation = receivePaymentSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;
  const amountPoisha = toPoisha(data.amountTaka);

  if (amountPoisha <= 0) {
    return {
      success: false,
      message: "টাকার পরিমাণ ০ এর বেশি হতে হবে।",
    };
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      // 1. Fetch customer and current balance
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, shopId, deletedAt: null },
      });

      if (!customer) {
        throw new Error("কাস্টমার খুঁজে পাওয়া যায়নি।");
      }

      // 2. Decrement customer balance
      const newBalancePoisha = customer.cachedBalancePoisha - amountPoisha;

      // 3. Create Payment record
      const p = await tx.payment.create({
        data: {
          shopId,
          customerId: customer.id,
          amountPoisha,
          method: data.method,
          reference: data.reference ? data.reference.trim() : null,
          note: data.note ? data.note.trim() : null,
          receivedById: session.user.id,
        },
      });

      // 4. Create LedgerEntry (Rule 3)
      const methodLabel =
        data.method === "CASH"
          ? "ক্যাশ"
          : data.method === "BKASH"
          ? "বিকাশ"
          : data.method === "NAGAD"
          ? "নগদ"
          : data.method;

      const desc = `বাকি জমা পরিশোধ (${methodLabel}${
        data.reference ? ` - ${data.reference}` : ""
      })`;

      await tx.ledgerEntry.create({
        data: {
          shopId,
          customerId: customer.id,
          entryType: LedgerEntryType.PAYMENT_RECEIVED,
          debitPoisha: 0,
          creditPoisha: amountPoisha,
          balanceAfterPoisha: newBalancePoisha,
          referenceType: LedgerReferenceType.PAYMENT,
          referenceId: p.id,
          description: desc,
        },
      });

      // 5. Update cached balance on customer
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          cachedBalancePoisha: newBalancePoisha,
        },
      });

      // 6. Record AuditLog (Rule 8)
      await logAudit({
        shopId,
        userId: session.user.id,
        action: "CREATE",
        entityType: "Payment",
        entityId: p.id,
        newValues: {
          customerId: customer.id,
          customerName: customer.name,
          amountPoisha,
          newBalancePoisha,
          method: data.method,
        },
        tx,
      });

      return p;
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${data.customerId}`);
    revalidatePath("/due-list");
    revalidatePath("/payments");
    revalidatePath("/");

    return {
      success: true,
      message: "টাকা জমা সফলভাবে সম্পন্ন হয়েছে!",
      data: { paymentId: payment.id },
    };
  } catch (error: unknown) {
    console.error("Error receiving payment:", error);
    const msg = error instanceof Error ? error.message : "টাকা জমা নিতে সমস্যা হয়েছে।";
    return {
      success: false,
      message: msg,
    };
  }
}
