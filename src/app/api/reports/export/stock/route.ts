import { NextResponse } from "next/server";
import { getSessionTenantDb } from "@/lib/auth/session";
import { fromPoisha } from "@/lib/money";

export async function GET() {
  try {
    const { db } = await getSessionTenantDb();

    const products = await db.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });

    const headers = [
      "পণ্যের নাম (Product Name)",
      "বারকোড / কোড (SKU)",
      "একক (Unit)",
      "ক্রয় মূল্য (Cost Price BDT)",
      "বিক্রয় মূল্য (Sell Price BDT)",
      "বর্তমান মজুদ স্টক (Stock Qty)",
      "মোট মজুদ মূল্য (Inventory Value BDT)",
      "সতর্কতা লেভেল (Low Alert Qty)",
      "অবস্থা (Status)",
    ];

    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = products.map((p) => {
      const isLow = p.cachedStock <= p.lowStockThreshold;
      const inventoryValuePoisha = p.cachedStock * p.buyPricePoisha;

      return [
        escapeCsv(p.name),
        escapeCsv(p.sku || ""),
        escapeCsv(p.unit),
        escapeCsv(fromPoisha(p.buyPricePoisha).toFixed(2)),
        escapeCsv(fromPoisha(p.sellPricePoisha).toFixed(2)),
        escapeCsv(p.cachedStock),
        escapeCsv(fromPoisha(inventoryValuePoisha).toFixed(2)),
        escapeCsv(p.lowStockThreshold),
        escapeCsv(isLow ? "কম স্টক" : "পর্যাপ্ত"),
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

    const filename = `inventory_stock_report_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error generating CSV";
    return new NextResponse(msg, { status: 500 });
  }
}
