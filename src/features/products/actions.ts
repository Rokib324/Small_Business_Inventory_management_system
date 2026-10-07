"use server";

import { getSessionTenantDb } from "@/lib/auth/session";
import { productSchema, editProductSchema, ProductFormInput, EditProductInput } from "./schemas";
import { toPoisha } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createProductAction(
  input: ProductFormInput
): Promise<ActionResponse<{ id: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Validate with Zod (Rule 7)
  const validation = productSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;
  const buyPricePoisha = toPoisha(data.buyPriceTaka);
  const sellPricePoisha = toPoisha(data.sellPriceTaka);

  try {
    const product = await prisma.$transaction(async (tx) => {
      // Create product
      const p = await tx.product.create({
        data: {
          shopId,
          name: data.name.trim(),
          sku: data.sku ? data.sku.trim() : null,
          unit: data.unit,
          buyPricePoisha,
          sellPricePoisha,
          cachedStock: data.initialStock,
          lowStockThreshold: data.lowStockThreshold,
        },
      });

      // Record initial stock movement if stock > 0 (Rule 4)
      if (data.initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            shopId,
            productId: p.id,
            quantity: data.initialStock,
            movementType: StockMovementType.PURCHASE,
            note: "প্রারম্ভিক স্টক (Opening Stock)",
          },
        });
      }

      // Record audit log (Rule 8)
      await logAudit({
        shopId,
        userId: session.user.id,
        action: "CREATE",
        entityType: "Product",
        entityId: p.id,
        newValues: {
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          buyPricePoisha,
          sellPricePoisha,
          cachedStock: p.cachedStock,
        },
        tx,
      });

      return p;
    });

    revalidatePath("/products");
    revalidatePath("/sales/new");
    revalidatePath("/");

    return {
      success: true,
      message: "পণ্য সফলভাবে যুক্ত হয়েছে!",
      data: { id: product.id },
    };
  } catch (error) {
    console.error("Error creating product:", error);
    return {
      success: false,
      message: "পণ্য তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

export async function updateProductAction(
  input: EditProductInput
): Promise<ActionResponse<{ id: string }>> {
  const { session, shopId } = await getSessionTenantDb();

  // 1. Validate with Zod (Rule 7)
  const validation = editProductSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;
  const buyPricePoisha = toPoisha(data.buyPriceTaka);
  const sellPricePoisha = toPoisha(data.sellPriceTaka);

  try {
    const existing = await prisma.product.findFirst({
      where: { id: data.id, shopId, deletedAt: null },
    });

    if (!existing) {
      return {
        success: false,
        message: "পণ্যটি খুঁজে পাওয়া যায়নি।",
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          sku: data.sku ? data.sku.trim() : null,
          unit: data.unit,
          buyPricePoisha,
          sellPricePoisha,
          lowStockThreshold: data.lowStockThreshold,
        },
      });

      // Record audit log (Rule 8)
      await logAudit({
        shopId,
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Product",
        entityId: p.id,
        oldValues: {
          name: existing.name,
          sku: existing.sku,
          unit: existing.unit,
          buyPricePoisha: existing.buyPricePoisha,
          sellPricePoisha: existing.sellPricePoisha,
          lowStockThreshold: existing.lowStockThreshold,
        },
        newValues: {
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          buyPricePoisha: p.buyPricePoisha,
          sellPricePoisha: p.sellPricePoisha,
          lowStockThreshold: p.lowStockThreshold,
        },
        tx,
      });

      return p;
    });

    revalidatePath("/products");
    revalidatePath("/sales/new");
    revalidatePath("/");

    return {
      success: true,
      message: "পণ্য সফলভাবে হালনাগাদ করা হয়েছে!",
      data: { id: updated.id },
    };
  } catch (error) {
    console.error("Error updating product:", error);
    return {
      success: false,
      message: "পণ্য আপডেট করতে সমস্যা হয়েছে।",
    };
  }
}

export async function deleteProductAction(
  id: string
): Promise<ActionResponse> {
  const { session, shopId } = await getSessionTenantDb();

  try {
    const existing = await prisma.product.findFirst({
      where: { id, shopId, deletedAt: null },
    });

    if (!existing) {
      return {
        success: false,
        message: "পণ্যটি খুঁজে পাওয়া যায়নি।",
      };
    }

    // Soft delete (Rule 6)
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await logAudit({
        shopId,
        userId: session.user.id,
        action: "DELETE",
        entityType: "Product",
        entityId: id,
        oldValues: { name: existing.name, cachedStock: existing.cachedStock },
        tx,
      });
    });

    revalidatePath("/products");
    revalidatePath("/sales/new");
    revalidatePath("/");

    return {
      success: true,
      message: "পণ্যটি সফলভাবে মুছে ফেলা হয়েছে।",
    };
  } catch (error) {
    console.error("Error deleting product:", error);
    return {
      success: false,
      message: "পণ্য মুছে ফেলতে সমস্যা হয়েছে।",
    };
  }
}
