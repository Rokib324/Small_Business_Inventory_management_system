"use server";

import { prisma } from "@/lib/db/prisma";
import { signupSchema, SignupInput } from "./schemas";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { signOut } from "@/lib/auth/auth";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function registerShopAndOwnerAction(
  data: SignupInput
): Promise<ActionResponse<{ shopId: string; userId: string }>> {
  // 1. Server-side Zod validation (Rule 7)
  const validation = signupSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      message: "ফরমের তথ্য সঠিক নয়। অনুগ্রহ করে পরীক্ষা করুন।",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const { shopName, ownerName, phone, email, address, password } = validation.data;

  // 2. Check if phone number already registered
  const existingPhone = await prisma.user.findFirst({
    where: { phone, deletedAt: null },
  });
  if (existingPhone) {
    return {
      success: false,
      message: "এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে।",
      errors: { phone: ["এই মোবাইল নম্বরটি নিবন্ধিত রয়েছে"] },
    };
  }

  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (existingEmail) {
      return {
        success: false,
        message: "এই ইমেইল ঠিকানা দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে।",
        errors: { email: ["এই ইমেইল ঠিকানাটি নিবন্ধিত রয়েছে"] },
      };
    }
  }

  // 3. Atomic creation of Shop + OWNER user + AuditLog
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create Shop
      const shop = await tx.shop.create({
        data: {
          name: shopName.trim(),
          phone: phone.trim(),
          address: address ? address.trim() : null,
          currency: "BDT",
        },
      });

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create OWNER User
      const user = await tx.user.create({
        data: {
          shopId: shop.id,
          name: ownerName.trim(),
          phone: phone.trim(),
          email: email ? email.toLowerCase().trim() : null,
          passwordHash,
          role: Role.OWNER,
        },
      });

      // Audit Log
      await logAudit({
        shopId: shop.id,
        userId: user.id,
        action: "CREATE",
        entityType: "ShopAndOwner",
        entityId: shop.id,
        newValues: {
          shopName: shop.name,
          ownerName: user.name,
          phone: user.phone,
        },
        tx,
      });

      return { shopId: shop.id, userId: user.id };
    });

    return {
      success: true,
      message: "দোকানের খাতা সফলভাবে তৈরি হয়েছে! অনুগ্রহ করে লগইন করুন।",
      data: result,
    };
  } catch (err: unknown) {
    console.error("Error creating shop and owner:", err);
    return {
      success: false,
      message: "দোকান নিবন্ধন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
