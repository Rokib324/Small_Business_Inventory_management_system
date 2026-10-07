"use server";

import { getSessionTenantDb } from "@/lib/auth/session";
import {
  customerSchema,
  editCustomerSchema,
  CustomerFormInput,
  EditCustomerInput,
} from "./schemas";
import { toPoisha } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { LedgerEntryType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createCustomerAction(
  input: CustomerFormInput
): Promise<ActionResponse<{ id: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Server-side Zod validation (Rule 7)
  const validation = customerSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;
  const openingDuePoisha = toPoisha(data.openingDueTaka || 0);

  try {
    const customer = await prisma.$transaction(async (tx) => {
      // 1. Create customer
      const c = await tx.customer.create({
        data: {
          shopId,
          name: data.name.trim(),
          phone: data.phone ? data.phone.trim() : null,
          address: data.address ? data.address.trim() : null,
          cachedBalancePoisha: openingDuePoisha,
        },
      });

      // 2. If opening due > 0, record opening LedgerEntry (Rule 3)
      if (openingDuePoisha > 0) {
        await tx.ledgerEntry.create({
          data: {
            shopId,
            customerId: c.id,
            entryType: LedgerEntryType.OPENING_BALANCE,
            debitPoisha: openingDuePoisha,
            creditPoisha: 0,
            balanceAfterPoisha: openingDuePoisha,
            description: "প্রারম্ভিক বাকি (Opening Due)",
          },
        });
      }

      // 3. Record AuditLog (Rule 8)
      await logAudit({
        shopId,
        userId: session.user.id,
        action: "CREATE",
        entityType: "Customer",
        entityId: c.id,
        newValues: {
          name: c.name,
          phone: c.phone,
          address: c.address,
          cachedBalancePoisha: c.cachedBalancePoisha,
        },
        tx,
      });

      return c;
    });

    revalidatePath("/customers");
    revalidatePath("/due-list");
    revalidatePath("/sales/new");
    revalidatePath("/");

    return {
      success: true,
      message: "কাস্টমার সফলভাবে যুক্ত হয়েছে!",
      data: { id: customer.id },
    };
  } catch (error) {
    console.error("Error creating customer:", error);
    return {
      success: false,
      message: "কাস্টমার তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

export async function updateCustomerAction(
  input: EditCustomerInput
): Promise<ActionResponse<{ id: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Server-side Zod validation (Rule 7)
  const validation = editCustomerSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    const existing = await prisma.customer.findFirst({
      where: { id: data.id, shopId, deletedAt: null },
    });

    if (!existing) {
      return {
        success: false,
        message: "কাস্টমার খুঁজে পাওয়া যায়নি।",
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          phone: data.phone ? data.phone.trim() : null,
          address: data.address ? data.address.trim() : null,
        },
      });

      // Record AuditLog (Rule 8)
      await logAudit({
        shopId,
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Customer",
        entityId: c.id,
        oldValues: {
          name: existing.name,
          phone: existing.phone,
          address: existing.address,
        },
        newValues: {
          name: c.name,
          phone: c.phone,
          address: c.address,
        },
        tx,
      });

      return c;
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${data.id}`);
    revalidatePath("/due-list");
    revalidatePath("/");

    return {
      success: true,
      message: "কাস্টমার তথ্য সফলভাবে আপডেট হয়েছে!",
      data: { id: updated.id },
    };
  } catch (error) {
    console.error("Error updating customer:", error);
    return {
      success: false,
      message: "কাস্টমার আপডেট করতে সমস্যা হয়েছে।",
    };
  }
}

export async function deleteCustomerAction(id: string): Promise<ActionResponse> {
  const { session, shopId } = await getSessionTenantDb();

  try {
    const existing = await prisma.customer.findFirst({
      where: { id, shopId, deletedAt: null },
    });

    if (!existing) {
      return {
        success: false,
        message: "কাস্টমার খুঁজে পাওয়া যায়নি।",
      };
    }

    // Soft delete (Rule 6)
    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await logAudit({
        shopId,
        userId: session.user.id,
        action: "DELETE",
        entityType: "Customer",
        entityId: id,
        oldValues: { name: existing.name, balance: existing.cachedBalancePoisha },
        tx,
      });
    });

    revalidatePath("/customers");
    revalidatePath("/due-list");
    revalidatePath("/");

    return {
      success: true,
      message: "কাস্টমার সফলভাবে মুছে ফেলা হয়েছে।",
    };
  } catch (error) {
    console.error("Error deleting customer:", error);
    return {
      success: false,
      message: "কাস্টমার মুছে ফেলতে সমস্যা হয়েছে।",
    };
  }
}
