"use server";

import { getSessionTenantDb } from "@/lib/auth/session";
import {
  createPurchaseSchema,
  CreatePurchaseInput,
} from "./schemas";
import { createPurchaseTransaction } from "./service";
import { toPoisha } from "@/lib/money";
import { revalidatePath } from "next/cache";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createPurchaseAction(
  input: CreatePurchaseInput
): Promise<ActionResponse<{ id: string; invoiceNumber: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Server-side validation (Rule 7)
  const validation = createPurchaseSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    const purchase = await createPurchaseTransaction({
      shopId,
      userId: session.user.id,
      supplierId: data.supplierId || null,
      clientId: data.clientId || null,
      invoiceNumber: data.invoiceNumber || undefined,
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        buyPricePoisha: toPoisha(item.buyPriceTaka),
      })),
      paidPoisha: toPoisha(data.paidTaka || 0),
      paymentMethod: data.paymentMethod,
      notes: data.notes || null,
    });

    if (!purchase) {
      throw new Error("ক্রয় সম্পন্ন করা যায়নি।");
    }

    revalidatePath("/purchases");
    revalidatePath("/products");
    revalidatePath("/suppliers");
    revalidatePath("/suppliers/due-list");
    revalidatePath("/");

    return {
      success: true,
      data: {
        id: purchase.id,
        invoiceNumber: purchase.invoiceNumber,
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "ক্রয় সংরক্ষণ করতে সমস্যা হয়েছে।";
    return {
      success: false,
      message: msg,
    };
  }
}

export async function getPurchasesAction(options: {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: string;
}) {
  const { db } = await getSessionTenantDb();
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: {
    deletedAt: null;
    supplierId?: string;
    OR?: Array<{
      invoiceNumber?: { contains: string; mode: "insensitive" };
      supplier?: {
        name?: { contains: string; mode: "insensitive" };
        companyName?: { contains: string; mode: "insensitive" };
      };
    }>;
  } = {
    deletedAt: null,
  };

  if (options.supplierId) {
    whereClause.supplierId = options.supplierId;
  }

  if (options.search) {
    const s = options.search.trim();
    whereClause.OR = [
      { invoiceNumber: { contains: s, mode: "insensitive" } },
      { supplier: { name: { contains: s, mode: "insensitive" } } },
      { supplier: { companyName: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [purchases, totalCount] = await Promise.all([
    db.purchase.findMany({
      where: whereClause,
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.purchase.count(whereClause),
  ]);

  return {
    purchases,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    page,
    limit,
  };
}

export async function getPurchaseByIdAction(id: string) {
  const { db } = await getSessionTenantDb();

  return db.purchase.findFirst({
    where: { id, deletedAt: null },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
      user: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });
}
