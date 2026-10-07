"use server";

import { auth } from "@/lib/auth/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  sendDueReminderSms,
  sendBulkDueReminderSms,
  sendSaleReceiptSms,
  getShopSmsStats,
} from "./service";
import { prisma } from "@/lib/db/prisma";
import { SmsType } from "@prisma/client";

const SendDueReminderSchema = z.object({
  customerId: z.string().min(1, "খদ্দের নির্বাচন করুন"),
  customMessage: z.string().optional(),
  templateId: z.string().optional(),
});

const SendBulkDueReminderSchema = z.object({
  minDueAmountPoisha: z.number().nonnegative(),
  customMessage: z.string().optional(),
  templateId: z.string().optional(),
});

const SendSaleReceiptSchema = z.object({
  saleId: z.string().min(1, "চালান নির্বাচন করুন"),
  customMessage: z.string().optional(),
  origin: z.string().optional(),
});

const UpsertTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "টেমপ্লেটের নাম আবশ্যক"),
  smsType: z.enum(["DUE_REMINDER", "SALE_RECEIPT", "PAYMENT_RECEIPT", "CUSTOM"]),
  template: z.string().min(5, "টেমপ্লেট বার্তা লিখুন"),
  isDefault: z.boolean().default(false),
});

export async function sendDueReminderAction(input: z.infer<typeof SendDueReminderSchema>) {
  const session = await auth();
  if (!session?.user?.shopId) {
    throw new Error("অননুমোদিত অনুরোধ। অনুগ্রহ করে লগইন করুন।");
  }

  const validated = SendDueReminderSchema.parse(input);

  const result = await sendDueReminderSms({
    shopId: session.user.shopId,
    customerId: validated.customerId,
    customMessage: validated.customMessage,
    templateId: validated.templateId,
    userId: session.user.id,
  });

  revalidatePath("/due-list");
  revalidatePath("/customers");
  revalidatePath(`/customers/${validated.customerId}`);
  return result;
}

export async function sendBulkDueReminderAction(input: z.infer<typeof SendBulkDueReminderSchema>) {
  const session = await auth();
  if (!session?.user?.shopId) {
    throw new Error("অননুমোদিত অনুরোধ। অনুগ্রহ করে লগইন করুন।");
  }

  const validated = SendBulkDueReminderSchema.parse(input);

  const result = await sendBulkDueReminderSms({
    shopId: session.user.shopId,
    minDueAmountPoisha: validated.minDueAmountPoisha,
    customMessage: validated.customMessage,
    templateId: validated.templateId,
    userId: session.user.id,
  });

  revalidatePath("/due-list");
  return result;
}

export async function sendSaleReceiptAction(input: z.infer<typeof SendSaleReceiptSchema>) {
  const session = await auth();
  if (!session?.user?.shopId) {
    throw new Error("অননুমোদিত অনুরোধ। অনুগ্রহ করে লগইন করুন।");
  }

  const validated = SendSaleReceiptSchema.parse(input);

  const result = await sendSaleReceiptSms({
    shopId: session.user.shopId,
    saleId: validated.saleId,
    customMessage: validated.customMessage,
    origin: validated.origin,
    userId: session.user.id,
  });

  revalidatePath(`/sales/${validated.saleId}`);
  return result;
}

export async function getShopSmsStatsAction() {
  const session = await auth();
  if (!session?.user?.shopId) {
    throw new Error("অননুমোদিত অনুরোধ।");
  }

  return await getShopSmsStats(session.user.shopId);
}

export async function getShopSmsLogsAction(limit: number = 30) {
  const session = await auth();
  if (!session?.user?.shopId) {
    throw new Error("অননুমোদিত অনুরোধ।");
  }

  return await prisma.smsLog.findMany({
    where: { shopId: session.user.shopId },
    include: {
      customer: {
        select: { name: true, phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getShopSmsTemplatesAction() {
  const session = await auth();
  if (!session?.user?.shopId) {
    throw new Error("অননুমোদিত অনুরোধ।");
  }

  return await prisma.smsTemplate.findMany({
    where: { shopId: session.user.shopId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export async function upsertSmsTemplateAction(input: z.infer<typeof UpsertTemplateSchema>) {
  const session = await auth();
  if (!session?.user?.shopId) {
    throw new Error("অননুমোদিত অনুরোধ।");
  }

  const validated = UpsertTemplateSchema.parse(input);

  if (validated.id) {
    const updated = await prisma.smsTemplate.updateMany({
      where: { id: validated.id, shopId: session.user.shopId },
      data: {
        name: validated.name,
        smsType: validated.smsType,
        template: validated.template,
        isDefault: validated.isDefault,
      },
    });
    revalidatePath("/settings/sms");
    return updated;
  }

  const created = await prisma.smsTemplate.create({
    data: {
      shopId: session.user.shopId,
      name: validated.name,
      smsType: validated.smsType,
      template: validated.template,
      isDefault: validated.isDefault,
    },
  });

  revalidatePath("/settings/sms");
  return created;
}
