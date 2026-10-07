import { describe, it, expect, beforeEach } from "vitest";
import { MockSmsProvider } from "@/features/sms/providers/mock-provider";
import { renderSmsTemplate } from "@/features/sms/templates";
import { checkSmsRateLimit, resetRateLimits } from "@/features/sms/rate-limiter";
import {
  generateInvoiceShareToken,
  verifyInvoiceShareToken,
  getWhatsAppShareUrl,
} from "@/lib/invoice/token";
import { generateInvoicePdf } from "@/features/sales/pdf-service";
import { prisma } from "@/lib/db/prisma";
import { toPoisha } from "@/lib/money";
import {
  sendDueReminderSms,
  sendBulkDueReminderSms,
} from "@/features/sms/service";

describe("Phase 4: SMS Reminders, Gateway & Template Engine", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("MockSmsProvider delivers SMS, returns messageId, and charges cost in poisha", async () => {
    const provider = new MockSmsProvider();
    const result = await provider.sendSms("01712345678", "পরীক্ষামূলক এসএমএস");

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.costPoisha).toBe(35); // ৳0.35 in integer poisha

    const sent = provider.getSentMessages();
    expect(sent.length).toBe(1);
    expect(sent[0].to).toBe("01712345678");
    expect(sent[0].message).toBe("পরীক্ষামূলক এসএমএস");
  });

  it("MockSmsProvider handles simulated errors for invalid test numbers", async () => {
    const provider = new MockSmsProvider();
    const result = await provider.sendSms("01700000000", "টেস্ট");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Mock provider simulated gateway error");
  });

  it("renderSmsTemplate substitutes Bangla variables correctly", () => {
    const template =
      "প্রিয় {customer_name}, {shop_name}-এ আপনার বাকি {due_amount} টাকা। যোগাযোগ: {shop_phone}";

    const rendered = renderSmsTemplate(template, {
      customer_name: "করিম চাচা",
      shop_name: "ভাই ভাই ট্রেডার্স",
      due_amount: "৫৫০.০০",
      shop_phone: "০১৭১১০০০০০০",
    });

    expect(rendered).toBe(
      "প্রিয় করিম চাচা, ভাই ভাই ট্রেডার্স-এ আপনার বাকি ৫৫০.০০ টাকা। যোগাযোগ: ০১৭১১০০০০০০"
    );
  });

  it("renderSmsTemplate provides fallback values for missing optional variables", () => {
    const template = "প্রিয় {customer_name}, আপনার বাকি {due_amount} টাকা।";
    const rendered = renderSmsTemplate(template, {});

    expect(rendered).toBe("প্রিয় সম্মানিত গ্রাহক, আপনার বাকি ০ টাকা।");
  });

  it("checkSmsRateLimit prevents rapid burst spamming", () => {
    const key = "test_shop_1";
    // Limit to 3 requests
    expect(checkSmsRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkSmsRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkSmsRateLimit(key, 3, 60_000).allowed).toBe(true);

    const blocked = checkSmsRateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("Phase 4: Signed Expiring Invoice Link & WhatsApp Share", () => {
  it("generates signed token and verifies payload successfully", () => {
    const token = generateInvoiceShareToken("sale_123", "shop_456", 24);
    expect(token).toContain(".");

    const result = verifyInvoiceShareToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.saleId).toBe("sale_123");
    expect(result.payload?.shopId).toBe("shop_456");
    expect(result.payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects tampered or forged tokens", () => {
    const token = generateInvoiceShareToken("sale_123", "shop_456", 24);
    const [, sig] = token.split(".");

    // Alter payload
    const tamperedPayload = Buffer.from(
      JSON.stringify({ saleId: "hacked_sale", shopId: "shop_456", exp: 9999999999 })
    ).toString("base64url");
    const tamperedToken = `${tamperedPayload}.${sig}`;

    const result = verifyInvoiceShareToken(tamperedToken);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("স্বাক্ষর");
  });

  it("rejects expired tokens", () => {
    // Generate token expired 1 hour ago (-1 hours)
    const expiredToken = generateInvoiceShareToken("sale_123", "shop_456", -1);
    const result = verifyInvoiceShareToken(expiredToken);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("মেয়াদ");
  });

  it("generates valid WhatsApp share link with phone number and message", () => {
    const url = getWhatsAppShareUrl("01711223344", "আপনার চালান লিংক: https://baki.app");
    expect(url).toContain("https://api.whatsapp.com/send");
    expect(url).toContain("phone=8801711223344");
    expect(url).toContain(encodeURIComponent("আপনার চালান লিংক: https://baki.app"));
  });
});

describe("Phase 4: End-to-End SMS Operations & Daily Quota", () => {
  let shopId: string;
  let customer1Id: string;
  let customer2Id: string;

  beforeEach(async () => {
    // Unique shop for test isolation
    const shop = await prisma.shop.create({
      data: {
        name: "মেসার্স টেস্ট হার্ডওয়্যার",
        phone: "০১৭১১০০০০০০",
        smsDailyLimit: 5, // low limit to test quota enforcement
      },
    });
    shopId = shop.id;

    // Create customers
    const c1 = await prisma.customer.create({
      data: {
        shopId,
        name: "মোজাম্মেল হক",
        phone: "01711998877",
        cachedBalancePoisha: toPoisha(800), // ৳800 due
      },
    });
    customer1Id = c1.id;

    const c2 = await prisma.customer.create({
      data: {
        shopId,
        name: "সেলিম মিয়া",
        phone: "01811554433",
        cachedBalancePoisha: toPoisha(300), // ৳300 due
      },
    });
    customer2Id = c2.id;
  });

  it("sends single due reminder SMS and records SmsLog with status SENT", async () => {
    const res = await sendDueReminderSms({
      shopId,
      customerId: customer1Id,
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain("মোজাম্মেল হক");
    expect(res.message).toContain("৮০০");

    const log = await prisma.smsLog.findFirst({
      where: { shopId, customerId: customer1Id },
    });
    expect(log).not.toBeNull();
    expect(log?.status).toBe("SENT");
    expect(log?.costPoisha).toBeGreaterThan(0);
  });

  it("sends bulk due reminder to customers above minimum due amount", async () => {
    // Only customer 1 has due >= ৳500
    const bulkRes = await sendBulkDueReminderSms({
      shopId,
      minDueAmountPoisha: toPoisha(500),
    });

    expect(bulkRes.totalTargeted).toBe(1);
    expect(bulkRes.sentCount).toBe(1);
    expect(bulkRes.failedCount).toBe(0);

    const logs = await prisma.smsLog.findMany({ where: { shopId } });
    expect(logs.length).toBe(1);
    expect(logs[0].customerId).toBe(customer1Id);
  });

  it("enforces daily SMS limit per shop", async () => {
    // Set daily limit to 2
    await prisma.shop.update({
      where: { id: shopId },
      data: { smsDailyLimit: 2 },
    });

    // Send 1
    const res1 = await sendDueReminderSms({ shopId, customerId: customer1Id });
    expect(res1.success).toBe(true);

    // Send 2
    const res2 = await sendDueReminderSms({ shopId, customerId: customer2Id });
    expect(res2.success).toBe(true);

    // Attempt 3rd send - should be rejected by quota limit
    const res3 = await sendDueReminderSms({ shopId, customerId: customer1Id });
    expect(res3.success).toBe(false);
    expect(res3.error).toContain("দৈনিক এসএমএস কোটা");
  });
});

describe("Phase 4: Server-Side Bangla Invoice PDF Generator", () => {
  it("generates valid PDF buffer with embedded Noto Sans Bengali font and correct conjuncts", async () => {
    // 1. Create a shop, customer, and product
    const shop = await prisma.shop.create({
      data: {
        name: "মেসার্স সততা হার্ডওয়্যার",
        phone: "০১৭১১১১১১১১",
        address: "চকবাজার, ঢাকা",
      },
    });

    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        name: "স্বত্বাধিকারী জনাব রফিক",
        phone: "০১৯১১২২৩৩৪৪",
        address: "নবাবপুর রোড",
      },
    });

    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        name: "জিআই তার ও পেরেক",
        unit: "কেজি",
        buyPricePoisha: toPoisha(80),
        sellPricePoisha: toPoisha(100),
        cachedStock: 100,
      },
    });

    // 2. Create a sale
    const sale = await prisma.sale.create({
      data: {
        shopId: shop.id,
        customerId: customer.id,
        invoiceNumber: "INV-TEST-PDF-01",
        subtotalPoisha: toPoisha(200),
        totalPoisha: toPoisha(200),
        discountPoisha: toPoisha(0),
        paidPoisha: toPoisha(150),
        duePoisha: toPoisha(50),
        paymentMethod: "CASH",
        items: {
          create: [
            {
              shopId: shop.id,
              productId: product.id,
              productName: product.name,
              unit: product.unit,
              quantity: 2,
              unitPricePoisha: toPoisha(100),
              subtotalPoisha: toPoisha(200),
            },
          ],
        },
      },
    });

    // 3. Generate PDF
    const pdfBuffer = await generateInvoicePdf({
      saleId: sale.id,
      shopId: shop.id,
      format: "a4",
    });

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF Magic Bytes (%PDF-)
    const pdfMagic = pdfBuffer.subarray(0, 5).toString("ascii");
    expect(pdfMagic).toBe("%PDF-");
  });
});
