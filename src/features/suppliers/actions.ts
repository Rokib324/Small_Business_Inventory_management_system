"use server";

import { getSessionTenantDb } from "@/lib/auth/session";
import {
  supplierSchema,
  editSupplierSchema,
  SupplierFormInput,
  EditSupplierInput,
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

export async function createSupplierAction(
  input: SupplierFormInput
): Promise<ActionResponse<{ id: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Server-side Zod validation (Rule 7)
  const validation = supplierSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;
  const openingPayablePoisha = toPoisha(data.openingPayableTaka || 0);

  try {
    const supplier = await prisma.$transaction(async (tx) => {
      // 1. Create Supplier
      const s = await tx.supplier.create({
        data: {
          shopId,
          name: data.name.trim(),
          companyName: data.companyName ? data.companyName.trim() : null,
          phone: data.phone ? data.phone.trim() : null,
          address: data.address ? data.address.trim() : null,
          cachedBalancePoisha: openingPayablePoisha,
        },
      });

      // 2. If opening payable > 0, record LedgerEntry (Rule 3)
      if (openingPayablePoisha > 0) {
        await tx.ledgerEntry.create({
          data: {
            shopId,
            supplierId: s.id,
            entryType: LedgerEntryType.OPENING_BALANCE,
            debitPoisha: 0,
            creditPoisha: openingPayablePoisha, // Payable to supplier
            balanceAfterPoisha: openingPayablePoisha,
            description: "প্রারম্ভিক মহাজন দেনা (Opening Payable)",
          },
        });
      }

      // 3. Record AuditLog (Rule 8)
      await logAudit({
        shopId,
        userId: session.user.id,
        action: "CREATE",
        entityType: "Supplier",
        entityId: s.id,
        newValues: {
          name: s.name,
          companyName: s.companyName,
          phone: s.phone,
          address: s.address,
          cachedBalancePoisha: s.cachedBalancePoisha,
        },
        tx,
      });

      return s;
    });

    revalidatePath("/suppliers");
    revalidatePath("/suppliers/due-list");
    revalidatePath("/purchases/new");
    revalidatePath("/");

    return {
      success: true,
      message: "মহাজন / সাপ্লায়ার সফলভাবে যুক্ত হয়েছে!",
      data: { id: supplier.id },
    };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return {
      success: false,
      message: "মহাজন তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

export async function updateSupplierAction(
  input: EditSupplierInput
): Promise<ActionResponse<{ id: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Server-side Zod validation (Rule 7)
  const validation = editSupplierSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    const existing = await prisma.supplier.findFirst({
      where: { id: data.id, shopId, deletedAt: null },
    });

    if (!existing) {
      return {
        success: false,
        message: "সাপ্লায়ার খুঁজে পাওয়া যায়নি।",
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.supplier.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          companyName: data.companyName ? data.companyName.trim() : null,
          phone: data.phone ? data.phone.trim() : null,
          address: data.address ? data.address.trim() : null,
        },
      });

      // Record AuditLog (Rule 8)
      await logAudit({
        shopId,
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Supplier",
        entityId: s.id,
        oldValues: {
          name: existing.name,
          companyName: existing.companyName,
          phone: existing.phone,
          address: existing.address,
        },
        newValues: {
          name: s.name,
          companyName: s.companyName,
          phone: s.phone,
          address: s.address,
        },
        tx,
      });

      return s;
    });

    revalidatePath("/suppliers");
    revalidatePath("/suppliers/due-list");
    revalidatePath("/");

    return {
      success: true,
      message: "মহাজনের তথ্য সফলভাবে আপডেট হয়েছে!",
      data: { id: updated.id },
    };
  } catch (error) {
    console.error("Error updating supplier:", error);
    return {
      success: false,
      message: "সাপ্লায়ার আপডেট করতে সমস্যা হয়েছে।",
    };
  }
}

export async function deleteSupplierAction(id: string): Promise<ActionResponse> {
  const { session, shopId } = await getSessionTenantDb();

  try {
    const existing = await prisma.supplier.findFirst({
      where: { id, shopId, deletedAt: null },
    });

    if (!existing) {
      return {
        success: false,
        message: "সাপ্লায়ার খুঁজে পাওয়া যায়নি।",
      };
    }

    // Soft delete (Rule 6)
    await prisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await logAudit({
        shopId,
        userId: session.user.id,
        action: "DELETE",
        entityType: "Supplier",
        entityId: id,
        oldValues: { name: existing.name, balance: existing.cachedBalancePoisha },
        tx,
      });
    });

    revalidatePath("/suppliers");
    revalidatePath("/suppliers/due-list");
    revalidatePath("/");

    return {
      success: true,
      message: "মহাজন সফলভাবে মুছে ফেলা হয়েছে।",
    };
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return {
      success: false,
      message: "মহাজন মুছে ফেলতে সমস্যা হয়েছে।",
    };
  }
}
