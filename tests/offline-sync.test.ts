import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { processSyncRequest } from "@/features/sync/sync-service";
import { PaymentMethod } from "@prisma/client";

describe("Phase 3: Offline Sync Engine Tests", () => {
  let shopId: string;
  let userId: string;
  let testProductId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    // Set up test tenant shop & user
    const shop = await prisma.shop.create({
      data: { name: "অফলাইন সিঙ্ক টেস্ট শপ" },
    });
    shopId = shop.id;

    const user = await prisma.user.create({
      data: {
        shopId,
        name: "ক্যাশিয়ার",
        phone: `01799${Date.now().toString().slice(-6)}`,
        passwordHash: "hash123",
      },
    });
    userId = user.id;

    // Create an initial product with 10 units in stock
    const product = await prisma.product.create({
      data: {
        shopId,
        name: "জিআই তার (GI Wire 12G)",
        unit: "KG",
        buyPricePoisha: 12000,
        sellPricePoisha: 18000,
        cachedStock: 10,
        lowStockThreshold: 3,
      },
    });
    testProductId = product.id;

    // Create an initial customer
    const customer = await prisma.customer.create({
      data: {
        shopId,
        name: "করিম ব্রাদার্স",
        phone: "01811112233",
        cachedBalancePoisha: 0,
      },
    });
    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Clean up test shop data
    await prisma.shop.delete({ where: { id: shopId } });
  });

  it("Test 1: Duplicate sync of the same clientId creates only one record (Idempotency)", async () => {
    const clientGeneratedId = `offline-cust-${Date.now()}`;

    const syncAction = {
      clientId: clientGeneratedId,
      actionType: "CREATE_CUSTOMER" as const,
      createdAt: new Date().toISOString(),
      payload: {
        clientId: clientGeneratedId,
        name: "মোস্তফা ইলেকট্রিক",
        phone: "01755554433",
        address: "চকবাজার, ঢাকা",
      },
    };

    // First Sync attempt
    const res1 = await processSyncRequest({
      shopId,
      userId,
      actions: [syncAction],
    });

    expect(res1.results.length).toBe(1);
    expect(res1.results[0].status).toBe("SUCCESS");
    expect(res1.results[0].clientId).toBe(clientGeneratedId);

    // Second Sync attempt (simulating retried network request with exact same clientId)
    const res2 = await processSyncRequest({
      shopId,
      userId,
      actions: [syncAction],
    });

    expect(res2.results.length).toBe(1);
    expect(res2.results[0].status).toBe("DUPLICATE");
    expect(res2.results[0].serverId).toBe(res1.results[0].serverId);

    // Verify DB count: only 1 customer was created
    const count = await prisma.customer.count({
      where: { shopId, clientId: clientGeneratedId },
    });
    expect(count).toBe(1);
  });

  it("Test 2: Offline sale then sync updates stock and ledger correctly", async () => {
    const saleClientId = `offline-sale-${Date.now()}`;

    // Initial stock was 10
    const saleAction = {
      clientId: saleClientId,
      actionType: "CREATE_SALE" as const,
      createdAt: new Date().toISOString(),
      payload: {
        clientId: saleClientId,
        customerId: testCustomerId,
        items: [
          {
            productId: testProductId,
            quantity: 4,
            unitPricePoisha: 18000, // 4 * 18000 = 72,000 poisha (৳720)
          },
        ],
        discountPoisha: 2000, // ৳20 discount -> total 70,000 poisha (৳700)
        paidPoisha: 30000, // ৳300 paid -> remaining due 40,000 poisha (৳400)
        paymentMethod: PaymentMethod.CASH,
        notes: "অফলাইন ফিল্ড সেল",
      },
    };

    const res = await processSyncRequest({
      shopId,
      userId,
      actions: [saleAction],
    });

    expect(res.results.length).toBe(1);
    expect(res.results[0].status).toBe("SUCCESS");

    // 1. Verify Sale created with correct totals
    const createdSale = await prisma.sale.findUnique({
      where: { id: res.results[0].serverId },
      include: { items: true },
    });
    expect(createdSale).not.toBeNull();
    expect(createdSale?.subtotalPoisha).toBe(72000);
    expect(createdSale?.totalPoisha).toBe(70000);
    expect(createdSale?.paidPoisha).toBe(30000);
    expect(createdSale?.duePoisha).toBe(40000);
    expect(createdSale?.clientId).toBe(saleClientId);

    // 2. Verify Product stock decremented by 4 (from 10 to 6)
    const product = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(product?.cachedStock).toBe(6);

    // 3. Verify Customer balance increased by due amount (from 0 to 40,000)
    const customer = await prisma.customer.findUnique({
      where: { id: testCustomerId },
    });
    expect(customer?.cachedBalancePoisha).toBe(40000);

    // 4. Verify append-only LedgerEntry exists
    const ledger = await prisma.ledgerEntry.findFirst({
      where: { shopId, customerId: testCustomerId, saleId: createdSale?.id },
    });
    expect(ledger).not.toBeNull();
    expect(ledger?.debitPoisha).toBe(40000);
    expect(ledger?.balanceAfterPoisha).toBe(40000);
  });

  it("Test 3: Two devices selling the same product offline sync without data loss and flag review on negative stock", async () => {
    // Current stock is 6.
    // Device A sells 4 units offline.
    // Device B sells 5 units offline concurrently.
    // Total offline demand: 9 units (> current stock of 6).
    const deviceASaleClientId = `dev-a-sale-${Date.now()}`;
    const deviceBSaleClientId = `dev-b-sale-${Date.now()}`;

    const actionDeviceA = {
      clientId: deviceASaleClientId,
      actionType: "CREATE_SALE" as const,
      createdAt: new Date().toISOString(),
      payload: {
        clientId: deviceASaleClientId,
        items: [{ productId: testProductId, quantity: 4, unitPricePoisha: 18000 }],
        paidPoisha: 72000,
      },
    };

    const actionDeviceB = {
      clientId: deviceBSaleClientId,
      actionType: "CREATE_SALE" as const,
      createdAt: new Date().toISOString(),
      payload: {
        clientId: deviceBSaleClientId,
        items: [{ productId: testProductId, quantity: 5, unitPricePoisha: 18000 }],
        paidPoisha: 90000,
      },
    };

    // Device A syncs first
    const resA = await processSyncRequest({
      shopId,
      userId,
      actions: [actionDeviceA],
    });
    expect(resA.results[0].status).toBe("SUCCESS");

    const stockAfterA = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(stockAfterA?.cachedStock).toBe(2); // 6 - 4 = 2
    expect(stockAfterA?.needsReview).toBe(false);

    // Device B syncs second
    const resB = await processSyncRequest({
      shopId,
      userId,
      actions: [actionDeviceB],
    });
    // Conflict Rule 6: NEVER reject a real sale. Accept it!
    expect(resB.results[0].status).toBe("SUCCESS");

    // Stock decrements past zero to -3 (2 - 5 = -3)
    const stockAfterB = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    expect(stockAfterB?.cachedStock).toBe(-3);
    // Product is flagged for review
    expect(stockAfterB?.needsReview).toBe(true);

    // Both sales are safely recorded
    const salesCount = await prisma.sale.count({
      where: {
        shopId,
        clientId: { in: [deviceASaleClientId, deviceBSaleClientId] },
      },
    });
    expect(salesCount).toBe(2);
  });
});
