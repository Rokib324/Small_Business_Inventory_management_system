/**
 * Baki (বাকি) - Ledger & Stock Integrity Reconciliation Script (Phase 2 Rule)
 *
 * Verifies:
 * 1. Customer cached balance matches sum of LedgerEntry (debit - credit)
 * 2. Product cached stock matches sum of StockMovement quantities
 * 3. Supplier cached balance matches sum of supplier LedgerEntry (credit - debit)
 *
 * Usage:
 *   npx tsx scripts/reconcile-integrity.ts
 *   npx tsx scripts/reconcile-integrity.ts --fix
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CustomerMismatch {
  id: string;
  shopId: string;
  name: string;
  phone: string | null;
  cachedBalancePoisha: number;
  derivedBalancePoisha: number;
  differencePoisha: number;
}

interface ProductMismatch {
  id: string;
  shopId: string;
  name: string;
  unit: string;
  cachedStock: number;
  derivedStock: number;
  difference: number;
}

interface SupplierMismatch {
  id: string;
  shopId: string;
  name: string;
  cachedBalancePoisha: number;
  derivedBalancePoisha: number;
  differencePoisha: number;
}

export async function runReconciliation(
  autoFix: boolean = false,
  filterShopId?: string
) {
  console.log("============================================================");
  console.log("🔍 Baki (বাকি) - Ledger & Stock Integrity Reconciliation");
  console.log("============================================================");
  if (filterShopId) {
    console.log(`Scoped to Shop ID: ${filterShopId}`);
  }
  if (autoFix) {
    console.log("⚠️  AUTO-FIX MODE ENABLED: Mismatches will be corrected in DB.");
  }
  console.log();

  const shopFilter = filterShopId ? { shopId: filterShopId } : {};

  // 1. RECONCILE CUSTOMERS
  console.log("1️⃣  Checking Customer Balances vs Ledger Entries...");
  const customers = await prisma.customer.findMany({
    where: { ...shopFilter, deletedAt: null },
    include: {
      ledgerEntries: {
        where: { deletedAt: null },
      },
    },
  });

  const customerMismatches: CustomerMismatch[] = [];

  for (const c of customers) {
    const derivedBalancePoisha = c.ledgerEntries.reduce(
      (sum, entry) => sum + (entry.debitPoisha || 0) - (entry.creditPoisha || 0),
      0
    );

    if (c.cachedBalancePoisha !== derivedBalancePoisha) {
      customerMismatches.push({
        id: c.id,
        shopId: c.shopId,
        name: c.name,
        phone: c.phone,
        cachedBalancePoisha: c.cachedBalancePoisha,
        derivedBalancePoisha,
        differencePoisha: c.cachedBalancePoisha - derivedBalancePoisha,
      });

      if (autoFix) {
        await prisma.customer.update({
          where: { id: c.id },
          data: { cachedBalancePoisha: derivedBalancePoisha },
        });
      }
    }
  }

  // 2. RECONCILE PRODUCTS
  console.log("2️⃣  Checking Product Stock vs Stock Movements...");
  const products = await prisma.product.findMany({
    where: { ...shopFilter, deletedAt: null },
    include: {
      stockMovements: {
        where: { deletedAt: null },
      },
    },
  });

  const productMismatches: ProductMismatch[] = [];

  for (const p of products) {
    const derivedStock = p.stockMovements.reduce(
      (sum, m) => sum + m.quantity,
      0
    );

    if (p.cachedStock !== derivedStock) {
      productMismatches.push({
        id: p.id,
        shopId: p.shopId,
        name: p.name,
        unit: p.unit,
        cachedStock: p.cachedStock,
        derivedStock,
        difference: p.cachedStock - derivedStock,
      });

      if (autoFix) {
        await prisma.product.update({
          where: { id: p.id },
          data: { cachedStock: derivedStock },
        });
      }
    }
  }

  // 3. RECONCILE SUPPLIERS
  console.log("3️⃣  Checking Supplier Balances vs Ledger Entries...");
  const suppliers = await prisma.supplier.findMany({
    where: { ...shopFilter, deletedAt: null },
    include: {
      ledgerEntries: {
        where: { deletedAt: null },
      },
    },
  });

  const supplierMismatches: SupplierMismatch[] = [];

  for (const s of suppliers) {
    // For supplier, credit increases payable, debit decreases payable
    const derivedBalancePoisha = s.ledgerEntries.reduce(
      (sum, entry) => sum + (entry.creditPoisha || 0) - (entry.debitPoisha || 0),
      0
    );

    if (s.cachedBalancePoisha !== derivedBalancePoisha) {
      supplierMismatches.push({
        id: s.id,
        shopId: s.shopId,
        name: s.name,
        cachedBalancePoisha: s.cachedBalancePoisha,
        derivedBalancePoisha,
        differencePoisha: s.cachedBalancePoisha - derivedBalancePoisha,
      });

      if (autoFix) {
        await prisma.supplier.update({
          where: { id: s.id },
          data: { cachedBalancePoisha: derivedBalancePoisha },
        });
      }
    }
  }

  console.log();
  console.log("============================================================");
  console.log("📊 RECONCILIATION SUMMARY REPORT");
  console.log("============================================================");
  console.log(
    `Customers Checked: ${customers.length} | Mismatches: ${customerMismatches.length}`
  );
  console.log(
    `Products Checked:  ${products.length}  | Mismatches: ${productMismatches.length}`
  );
  console.log(
    `Suppliers Checked: ${suppliers.length} | Mismatches: ${supplierMismatches.length}`
  );
  console.log("------------------------------------------------------------");

  if (customerMismatches.length > 0) {
    console.log("\n❌ CUSTOMER BALANCE MISMATCHES:");
    console.table(
      customerMismatches.map((m) => ({
        Name: m.name,
        Phone: m.phone || "N/A",
        "Cached (৳)": (m.cachedBalancePoisha / 100).toFixed(2),
        "Derived (৳)": (m.derivedBalancePoisha / 100).toFixed(2),
        "Diff (৳)": (m.differencePoisha / 100).toFixed(2),
      }))
    );
  }

  if (productMismatches.length > 0) {
    console.log("\n❌ PRODUCT STOCK MISMATCHES:");
    console.table(
      productMismatches.map((m) => ({
        Name: m.name,
        Unit: m.unit,
        "Cached Stock": m.cachedStock,
        "Derived Stock": m.derivedStock,
        Difference: m.difference,
      }))
    );
  }

  if (supplierMismatches.length > 0) {
    console.log("\n❌ SUPPLIER BALANCE MISMATCHES:");
    console.table(
      supplierMismatches.map((m) => ({
        Name: m.name,
        "Cached (৳)": (m.cachedBalancePoisha / 100).toFixed(2),
        "Derived (৳)": (m.derivedBalancePoisha / 100).toFixed(2),
        "Diff (৳)": (m.differencePoisha / 100).toFixed(2),
      }))
    );
  }

  const totalMismatches =
    customerMismatches.length +
    productMismatches.length +
    supplierMismatches.length;

  if (totalMismatches === 0) {
    console.log("\n✅ SUCCESS: All cached balances and stocks match ledgers 100%!");
    console.log("============================================================\n");
    return { success: true, totalMismatches: 0 };
  } else if (autoFix) {
    console.log(
      `\n🔧 REPAIRED: Corrected all ${totalMismatches} mismatches successfully!`
    );
    console.log("============================================================\n");
    return { success: true, totalMismatches };
  } else {
    console.log(
      `\n⚠️  FOUND ${totalMismatches} MISMATCH(ES). Run with --fix to correct them.`
    );
    console.log("============================================================\n");
    return { success: false, totalMismatches };
  }
}

// Execute when invoked directly from CLI
if (require.main === module || process.argv[1]?.endsWith("reconcile-integrity.ts")) {
  const autoFix = process.argv.includes("--fix");
  runReconciliation(autoFix)
    .then((res) => {
      if (!res.success && !autoFix) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Fatal reconciliation error:", err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
