import { PrismaClient, Role, StockMovementType, LedgerEntryType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Create or Find Demo Shop
  let shop = await prisma.shop.findFirst({
    where: { name: "মেসার্স ভাই ভাই হার্ডওয়্যার" },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        name: "মেসার্স ভাই ভাই হার্ডওয়্যার",
        phone: "01711000000",
        address: "দোকান নং ১২, নিউ মার্কেট রোড, ঢাকা",
        currency: "BDT",
      },
    });
    console.log(`✅ Created Shop: ${shop.name} (${shop.id})`);
  }

  // 2. Create Users
  const passwordHash = await bcrypt.hash("password123", 10);

  // Owner User
  const owner = await prisma.user.upsert({
    where: { phone: "01711000000" },
    update: {},
    create: {
      shopId: shop.id,
      name: "মো: রফিকুল ইসলাম",
      phone: "01711000000",
      email: "owner@baki.com",
      passwordHash,
      role: Role.OWNER,
    },
  });
  console.log(`✅ Upserted Owner: ${owner.name} (${owner.phone})`);

  // Staff User
  const staff = await prisma.user.upsert({
    where: { phone: "01711000001" },
    update: {},
    create: {
      shopId: shop.id,
      name: "মো: সুমন আহমেদ",
      phone: "01711000001",
      email: "staff@baki.com",
      passwordHash,
      role: Role.STAFF,
    },
  });
  console.log(`✅ Upserted Staff: ${staff.name} (${staff.phone})`);

  // 3. Create Hardware Products
  const demoProducts = [
    {
      name: "১/২ ইঞ্চি জিআই পাইপ (২০ ফুট)",
      sku: "GIP-05",
      unit: "PCS",
      buyPricePoisha: 38000, // ৳380
      sellPricePoisha: 45000, // ৳450
      cachedStock: 60,
      lowStockThreshold: 10,
    },
    {
      name: "৩/৪ ইঞ্চি পিভিসি পাইপ (১০ ফুট)",
      sku: "PVC-075",
      unit: "PCS",
      buyPricePoisha: 12000, // ৳120
      sellPricePoisha: 16000, // ৳160
      cachedStock: 100,
      lowStockThreshold: 15,
    },
    {
      name: "শাহ সিমেন্ট স্পেশাল (৫০ কেজি)",
      sku: "CMT-SHAH",
      unit: "BAG",
      buyPricePoisha: 52000, // ৳520
      sellPricePoisha: 56000, // ৳560
      cachedStock: 80,
      lowStockThreshold: 20,
    },
    {
      name: "বিএসআরএম ৬০ গ্রেড রড (১০ মিমি)",
      sku: "ROD-10MM",
      unit: "KG",
      buyPricePoisha: 9200, // ৳92
      sellPricePoisha: 10200, // ৳102
      cachedStock: 500,
      lowStockThreshold: 100,
    },
    {
      name: "বার্গার ওয়েদারকোট পেইন্ট ৪ লিটার",
      sku: "PNT-BGR-4L",
      unit: "BOX",
      buyPricePoisha: 185000, // ৳1850
      sellPricePoisha: 210000, // ৳2100
      cachedStock: 25,
      lowStockThreshold: 5,
    },
    {
      name: "পেইন্ট ব্রাশ ৪ ইঞ্চি",
      sku: "BRSH-4IN",
      unit: "PCS",
      buyPricePoisha: 7000, // ৳70
      sellPricePoisha: 10000, // ৳100
      cachedStock: 45,
      lowStockThreshold: 10,
    },
    {
      name: "স্ক্রু ২ ইঞ্চি (১০০ পিস প্যাকেট)",
      sku: "SCRW-2IN",
      unit: "BOX",
      buyPricePoisha: 8000, // ৳80
      sellPricePoisha: 12000, // ৳120
      cachedStock: 75,
      lowStockThreshold: 15,
    },
  ];

  for (const p of demoProducts) {
    const existing = await prisma.product.findFirst({
      where: { shopId: shop.id, sku: p.sku },
    });

    if (!existing) {
      const created = await prisma.product.create({
        data: {
          shopId: shop.id,
          ...p,
        },
      });

      // Record initial StockMovement
      await prisma.stockMovement.create({
        data: {
          shopId: shop.id,
          productId: created.id,
          quantity: p.cachedStock,
          movementType: StockMovementType.PURCHASE,
          note: "প্রারম্ভিক স্টক (Initial opening inventory)",
        },
      });
    }
  }
  console.log(`✅ Seeded ${demoProducts.length} demo hardware products with stock movements`);

  // 4. Create Demo Customers
  const demoCustomers = [
    {
      name: "করিম মিয়া (কনস্ট্রাক্টর)",
      phone: "01812345678",
      address: "চকবাজার, ঢাকা",
      openingDuePoisha: 1250000, // ৳12,500 due
    },
    {
      name: "রহিম ট্রেডার্স",
      phone: "01912345678",
      address: "নিউ মার্কেট, ঢাকা",
      openingDuePoisha: 520000, // ৳5,200 due
    },
    {
      name: "জাহিদ হোসেন",
      phone: "01712345678",
      address: "মিরপুর-১০, ঢাকা",
      openingDuePoisha: 0,
    },
  ];

  for (const c of demoCustomers) {
    const existing = await prisma.customer.findFirst({
      where: { shopId: shop.id, phone: c.phone },
    });

    if (!existing) {
      const customer = await prisma.customer.create({
        data: {
          shopId: shop.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          cachedBalancePoisha: c.openingDuePoisha,
        },
      });

      if (c.openingDuePoisha > 0) {
        await prisma.ledgerEntry.create({
          data: {
            shopId: shop.id,
            customerId: customer.id,
            entryType: LedgerEntryType.OPENING_BALANCE,
            debitPoisha: c.openingDuePoisha,
            creditPoisha: 0,
            balanceAfterPoisha: c.openingDuePoisha,
            description: "প্রারম্ভিক বাকি (Opening Due Balance)",
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${demoCustomers.length} demo customers with ledger records`);

  console.log("🎉 Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
