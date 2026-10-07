"use server";

import { getSessionTenantDb } from "@/lib/auth/session";
import { createSaleSchema, CreateSaleFormInput } from "./schemas";
import { toPoisha } from "@/lib/money";
import { createSaleTransaction } from "./service";
import { revalidatePath } from "next/cache";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createSaleAction(
  input: CreateSaleFormInput
): Promise<ActionResponse<{ saleId: string; invoiceNumber: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Server-side Zod validation (Rule 7)
  const validation = createSaleSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "চালানের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;
  const discountPoisha = toPoisha(data.discountTaka);
  const paidPoisha = toPoisha(data.paidTaka);

  const items = data.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    unitPricePoisha: toPoisha(i.unitPriceTaka),
  }));

  try {
    // 2. Execute atomic sale transaction (Rule 5)
    const sale = await createSaleTransaction({
      shopId,
      userId: session.user.id,
      customerId: data.customerId || null,
      clientId: data.clientId || null,
      items,
      discountPoisha,
      paidPoisha,
      paymentMethod: data.paymentMethod,
      notes: data.notes || null,
    });

    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/customers");
    revalidatePath("/due-list");
    revalidatePath("/");

    return {
      success: true,
      message: "বিক্রয় চালান সফলভাবে তৈরি হয়েছে!",
      data: {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
      },
    };
  } catch (error: unknown) {
    console.error("Error creating sale:", error);
    const msg = error instanceof Error ? error.message : "চালান তৈরিতে সমস্যা হয়েছে।";
    return {
      success: false,
      message: msg,
    };
  }
}

export async function getSaleShareDataAction(saleId: string): Promise<
  ActionResponse<{
    shareUrl: string;
    whatsAppUrl: string | null;
    invoiceNumber: string;
    customerPhone: string | null;
  }>
> {
  const { shopId } = await getSessionTenantDb();
  const { prisma } = await import("@/lib/db/prisma");
  const { getInvoiceShareUrl, getWhatsAppShareUrl } = await import("@/lib/invoice/token");

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, shopId, deletedAt: null },
    include: {
      customer: true,
      shop: true,
    },
  });

  if (!sale) {
    return { success: false, message: "চালান খুঁজে পাওয়া যায়নি।" };
  }

  // Base URL from env or default
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const shareUrl = getInvoiceShareUrl(sale.id, shopId, origin, 168); // 7 days expiring token

  let whatsAppUrl: string | null = null;
  if (sale.customer?.phone) {
    const text = `আসসালামু আলাইকুম ${sale.customer.name}, ${sale.shop.name} থেকে আপনার ক্রয়ের চালানটি (নং: ${sale.invoiceNumber}) দেখতে নিচের লিংকে প্রবেশ করুন:\n${shareUrl}`;
    whatsAppUrl = getWhatsAppShareUrl(sale.customer.phone, text);
  }

  return {
    success: true,
    data: {
      shareUrl,
      whatsAppUrl,
      invoiceNumber: sale.invoiceNumber,
      customerPhone: sale.customer?.phone || null,
    },
  };
}

