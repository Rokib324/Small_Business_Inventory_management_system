import { prisma } from "@/lib/db/prisma";
import { SmsType, SmsStatus } from "@prisma/client";
import { getSmsProvider } from "./providers";
import { renderSmsTemplate, DEFAULT_SMS_TEMPLATES } from "./templates";
import { checkSmsRateLimit } from "./rate-limiter";
import { getInvoiceShareUrl } from "@/lib/invoice/token";
import { formatMoneyBn } from "@/lib/money";

export interface SendSmsResultStatus {
  success: boolean;
  smsLogId?: string;
  error?: string;
  message?: string;
}

export interface BulkSmsResultStatus {
  totalTargeted: number;
  sentCount: number;
  failedCount: number;
  errors: Array<{ customerName: string; phone: string; error: string }>;
}

/**
 * Get start and end of today in UTC/local for daily limit check
 */
function getTodayDateRange(): { startOfDay: Date; endOfDay: Date } {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

/**
 * Verify shop daily send limit before transmitting SMS
 */
async function checkDailyLimit(shopId: string, countNeeded: number = 1): Promise<{ allowed: boolean; currentCount: number; dailyLimit: number }> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { smsDailyLimit: true },
  });

  const dailyLimit = shop?.smsDailyLimit ?? 100;
  const { startOfDay, endOfDay } = getTodayDateRange();

  const currentCount = await prisma.smsLog.count({
    where: {
      shopId,
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { in: [SmsStatus.SENT, SmsStatus.PENDING] },
    },
  });

  if (currentCount + countNeeded > dailyLimit) {
    return { allowed: false, currentCount, dailyLimit };
  }

  return { allowed: true, currentCount, dailyLimit };
}

/**
 * Send due reminder SMS to a single customer
 */
export async function sendDueReminderSms(params: {
  shopId: string;
  customerId: string;
  customMessage?: string;
  templateId?: string;
  userId?: string;
}): Promise<SendSmsResultStatus> {
  const { shopId, customerId, customMessage, templateId, userId } = params;

  // 1. Rate limit
  const rateLimit = checkSmsRateLimit(shopId, 15, 60_000);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `খুব ঘনঘন অনুরোধ করা হচ্ছে। অনুগ্রহ করে ${rateLimit.retryAfterSeconds} সেকেন্ড পর চেষ্টা করুন।`,
    };
  }

  // 2. Daily limit
  const dailyCheck = await checkDailyLimit(shopId, 1);
  if (!dailyCheck.allowed) {
    return {
      success: false,
      error: `দোকানের দৈনিক এসএমএস কোটা (${dailyCheck.dailyLimit}টি) শেষ হয়ে গেছে। আজ আর পাঠানো সম্ভব নয়।`,
    };
  }

  // 3. Fetch customer and shop
  const [customer, shop] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, shopId, deletedAt: null },
    }),
    prisma.shop.findUnique({
      where: { id: shopId },
    }),
  ]);

  if (!customer) {
    return { success: false, error: "খদ্দের পাওয়া যায়নি।" };
  }

  if (!customer.phone || customer.phone.trim().length < 10) {
    return { success: false, error: "খদ্দেরের কোনো বৈধ মোবাইল নম্বর নেই।" };
  }

  if (customer.cachedBalancePoisha <= 0) {
    return { success: false, error: "এই খদ্দেরের কোনো বকেয়া বা বাকি টাকা নেই।" };
  }

  if (!shop) {
    return { success: false, error: "দোকানের তথ্য পাওয়া যায়নি।" };
  }

  // 4. Resolve Template
  let rawTemplate = customMessage;
  if (!rawTemplate && templateId) {
    const savedTemplate = await prisma.smsTemplate.findFirst({
      where: { id: templateId, shopId, deletedAt: null },
    });
    if (savedTemplate) {
      rawTemplate = savedTemplate.template;
    }
  }

  if (!rawTemplate) {
    rawTemplate = DEFAULT_SMS_TEMPLATES.DUE_REMINDER.template;
  }

  const finalMessage = renderSmsTemplate(rawTemplate, {
    customer_name: customer.name,
    shop_name: shop.name,
    shop_phone: shop.phone || "",
    due_amount: formatMoneyBn(customer.cachedBalancePoisha),
  });

  // 5. Send via active SMS Provider
  const provider = getSmsProvider();
  const sendResult = await provider.sendSms(customer.phone, finalMessage);

  // 6. Record SmsLog
  const smsLog = await prisma.smsLog.create({
    data: {
      shopId,
      customerId: customer.id,
      recipientPhone: customer.phone,
      message: finalMessage,
      smsType: SmsType.DUE_REMINDER,
      status: sendResult.success ? SmsStatus.SENT : SmsStatus.FAILED,
      costPoisha: sendResult.costPoisha || 0,
      provider: provider.name,
      messageId: sendResult.messageId || null,
      error: sendResult.error || null,
    },
  });

  // 7. Audit Log
  if (userId) {
    await prisma.auditLog.create({
      data: {
        shopId,
        userId,
        action: "CREATE",
        entityType: "SmsLog",
        entityId: smsLog.id,
        newValues: {
          recipientPhone: customer.phone,
          status: smsLog.status,
          type: "DUE_REMINDER",
        },
      },
    });
  }

  if (!sendResult.success) {
    return {
      success: false,
      smsLogId: smsLog.id,
      error: sendResult.error || "এসএমএস গেটওয়ে থেকে পাঠানোর সময় ত্রুটি হয়েছে।",
    };
  }

  return {
    success: true,
    smsLogId: smsLog.id,
    message: finalMessage,
  };
}

/**
 * Bulk send due reminder SMS to all customers above minimum due amount
 */
export async function sendBulkDueReminderSms(params: {
  shopId: string;
  minDueAmountPoisha: number;
  templateId?: string;
  customMessage?: string;
  userId?: string;
}): Promise<BulkSmsResultStatus> {
  const { shopId, minDueAmountPoisha, templateId, customMessage, userId } = params;

  // 1. Find matching customers with phone and due >= minDueAmountPoisha
  const customers = await prisma.customer.findMany({
    where: {
      shopId,
      deletedAt: null,
      cachedBalancePoisha: { gte: minDueAmountPoisha },
      phone: { not: null },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      cachedBalancePoisha: true,
    },
  });

  const validCustomers = customers.filter(
    (c) => c.phone && c.phone.trim().length >= 10
  );

  if (validCustomers.length === 0) {
    return {
      totalTargeted: 0,
      sentCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  // 2. Check daily limit
  const dailyCheck = await checkDailyLimit(shopId, validCustomers.length);
  if (!dailyCheck.allowed) {
    const remaining = Math.max(0, dailyCheck.dailyLimit - dailyCheck.currentCount);
    throw new Error(
      `দৈনিক এসএমএস কোটা অপর্যাপ্ত। মোট প্রাপক ${validCustomers.length} জন, কিন্তু আজ বাকি কোটা আছে মাত্র ${remaining} টি।`
    );
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const shopName = shop?.name || "আমাদের দোকান";
  const shopPhone = shop?.phone || "";

  // 3. Resolve template
  let rawTemplate = customMessage;
  if (!rawTemplate && templateId) {
    const savedTemplate = await prisma.smsTemplate.findFirst({
      where: { id: templateId, shopId, deletedAt: null },
    });
    if (savedTemplate) {
      rawTemplate = savedTemplate.template;
    }
  }
  if (!rawTemplate) {
    rawTemplate = DEFAULT_SMS_TEMPLATES.DUE_REMINDER.template;
  }

  const provider = getSmsProvider();
  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ customerName: string; phone: string; error: string }> = [];

  for (const customer of validCustomers) {
    const phone = customer.phone!;
    const finalMessage = renderSmsTemplate(rawTemplate, {
      customer_name: customer.name,
      shop_name: shopName,
      shop_phone: shopPhone,
      due_amount: formatMoneyBn(customer.cachedBalancePoisha),
    });

    try {
      const result = await provider.sendSms(phone, finalMessage);

      await prisma.smsLog.create({
        data: {
          shopId,
          customerId: customer.id,
          recipientPhone: phone,
          message: finalMessage,
          smsType: SmsType.DUE_REMINDER,
          status: result.success ? SmsStatus.SENT : SmsStatus.FAILED,
          costPoisha: result.costPoisha || 0,
          provider: provider.name,
          messageId: result.messageId || null,
          error: result.error || null,
        },
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push({
          customerName: customer.name,
          phone,
          error: result.error || "এসএমএস পাঠানো ব্যর্থ",
        });
      }
    } catch (err: unknown) {
      failedCount++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ customerName: customer.name, phone, error: msg });
    }
  }

  if (userId) {
    await prisma.auditLog.create({
      data: {
        shopId,
        userId,
        action: "CREATE",
        entityType: "BulkSms",
        entityId: `bulk_${Date.now()}`,
        newValues: {
          totalTargeted: validCustomers.length,
          sentCount,
          failedCount,
        },
      },
    });
  }

  return {
    totalTargeted: validCustomers.length,
    sentCount,
    failedCount,
    errors,
  };
}

/**
 * Send sale receipt SMS after a sale
 */
export async function sendSaleReceiptSms(params: {
  shopId: string;
  saleId: string;
  customMessage?: string;
  userId?: string;
  origin?: string;
}): Promise<SendSmsResultStatus> {
  const { shopId, saleId, customMessage, userId, origin = "http://localhost:3000" } = params;

  const [sale, shop] = await Promise.all([
    prisma.sale.findFirst({
      where: { id: saleId, shopId, deletedAt: null },
      include: { customer: true },
    }),
    prisma.shop.findUnique({
      where: { id: shopId },
    }),
  ]);

  if (!sale) {
    return { success: false, error: "চালান খুঁজে পাওয়া যায়নি।" };
  }

  if (!sale.customer || !sale.customer.phone || sale.customer.phone.trim().length < 10) {
    return { success: false, error: "গ্রাহকের কোনো সংরক্ষিত মোবাইল নম্বর নেই।" };
  }

  // Check rate limit and daily limit
  const rateLimit = checkSmsRateLimit(shopId, 20, 60_000);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `অনুগ্রহ করে ${rateLimit.retryAfterSeconds} সেকেন্ড পর চেষ্টা করুন।`,
    };
  }

  const dailyCheck = await checkDailyLimit(shopId, 1);
  if (!dailyCheck.allowed) {
    return {
      success: false,
      error: `দোকানের দৈনিক এসএমএস কোটা (${dailyCheck.dailyLimit}টি) পূর্ণ হয়ে গেছে।`,
    };
  }

  // Generate signed expiring public invoice link
  const invoiceShareLink = getInvoiceShareUrl(sale.id, shopId, origin, 168);

  const rawTemplate = customMessage || DEFAULT_SMS_TEMPLATES.SALE_RECEIPT.template;
  const finalMessage = renderSmsTemplate(rawTemplate, {
    customer_name: sale.customer.name,
    shop_name: shop?.name || "আমাদের দোকান",
    shop_phone: shop?.phone || "",
    invoice_no: sale.invoiceNumber,
    total_amount: formatMoneyBn(sale.totalPoisha),
    paid_amount: formatMoneyBn(sale.paidPoisha),
    due_amount: formatMoneyBn(sale.duePoisha),
    invoice_link: invoiceShareLink,
  });

  const provider = getSmsProvider();
  const sendResult = await provider.sendSms(sale.customer.phone, finalMessage);

  const smsLog = await prisma.smsLog.create({
    data: {
      shopId,
      customerId: sale.customer.id,
      recipientPhone: sale.customer.phone,
      message: finalMessage,
      smsType: SmsType.SALE_RECEIPT,
      status: sendResult.success ? SmsStatus.SENT : SmsStatus.FAILED,
      costPoisha: sendResult.costPoisha || 0,
      provider: provider.name,
      messageId: sendResult.messageId || null,
      error: sendResult.error || null,
    },
  });

  if (userId) {
    await prisma.auditLog.create({
      data: {
        shopId,
        userId,
        action: "CREATE",
        entityType: "SmsLog",
        entityId: smsLog.id,
        newValues: {
          recipientPhone: sale.customer.phone,
          status: smsLog.status,
          type: "SALE_RECEIPT",
          saleId,
        },
      },
    });
  }

  if (!sendResult.success) {
    return {
      success: false,
      smsLogId: smsLog.id,
      error: sendResult.error || "এসএমএস পাঠানো যায়নি।",
    };
  }

  return {
    success: true,
    smsLogId: smsLog.id,
    message: finalMessage,
  };
}

/**
 * Get SMS stats for a shop (daily usage, limit, total logs)
 */
export async function getShopSmsStats(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { smsDailyLimit: true },
  });

  const dailyLimit = shop?.smsDailyLimit ?? 100;
  const { startOfDay, endOfDay } = getTodayDateRange();

  const [todaySent, totalCostResult] = await Promise.all([
    prisma.smsLog.count({
      where: {
        shopId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { in: [SmsStatus.SENT, SmsStatus.PENDING] },
      },
    }),
    prisma.smsLog.aggregate({
      where: { shopId, status: SmsStatus.SENT },
      _sum: { costPoisha: true },
    }),
  ]);

  return {
    dailyLimit,
    todaySent,
    remaining: Math.max(0, dailyLimit - todaySent),
    totalCostPoisha: totalCostResult._sum.costPoisha ?? 0,
  };
}
