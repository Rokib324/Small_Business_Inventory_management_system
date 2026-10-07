import { NextResponse } from "next/server";
import { getSessionTenantDb } from "@/lib/auth/session";
import { fromPoisha } from "@/lib/money";

export async function GET() {
  try {
    const { db } = await getSessionTenantDb();

    const customers = await db.customer.findMany({
      where: {
        cachedBalancePoisha: { gt: 0 },
        deletedAt: null,
      },
      orderBy: { cachedBalancePoisha: "desc" },
    });

    const headers = [
      "কাস্টমারের নাম (Customer Name)",
      "মোবাইল নম্বর (Phone)",
      "ঠিকানা (Address)",
      "বকেয়া বাকি টাকা (Due Amount BDT)",
      "তারিখ (Date)",
    ];

    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = customers.map((c) => [
      escapeCsv(c.name),
      escapeCsv(c.phone || ""),
      escapeCsv(c.address || ""),
      escapeCsv(fromPoisha(c.cachedBalancePoisha).toFixed(2)),
      escapeCsv(new Date(c.updatedAt).toISOString().split("T")[0]),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

    const filename = `customer_dues_report_${new Date().toISOString().split("T")[0]}.csv`;

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
