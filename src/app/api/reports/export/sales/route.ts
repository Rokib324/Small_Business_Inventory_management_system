import { NextRequest, NextResponse } from "next/server";
import { getSessionTenantDb } from "@/lib/auth/session";
import { fromPoisha } from "@/lib/money";

export async function GET(request: NextRequest) {
  try {
    const { db } = await getSessionTenantDb();
    const { searchParams } = new URL(request.url);

    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    const whereClause: {
      deletedAt: null;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      deletedAt: null,
    };

    if (fromStr || toStr) {
      whereClause.createdAt = {};
      if (fromStr) {
        whereClause.createdAt.gte = new Date(fromStr);
      }
      if (toStr) {
        const toDate = new Date(toStr);
        toDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = toDate;
      }
    }

    const sales = await db.sale.findMany({
      where: whereClause,
      include: {
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV lines with UTF-8 BOM for Bangla support in Excel
    const headers = [
      "চালান নং (Invoice No)",
      "তারিখ (Date)",
      "কাস্টমারের নাম (Customer)",
      "ফোন নম্বর (Phone)",
      "উপ-মোট (Subtotal BDT)",
      "ছাড় (Discount BDT)",
      "সর্বমোট (Total BDT)",
      "জমা (Paid BDT)",
      "বাকি (Due BDT)",
      "পরিশোধ মাধ্যম (Payment Method)",
    ];

    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    interface SaleExportItem {
      invoiceNumber: string;
      createdAt: Date;
      customer: { name: string; phone: string | null } | null;
      subtotalPoisha: number;
      discountPoisha: number;
      totalPoisha: number;
      paidPoisha: number;
      duePoisha: number;
      paymentMethod: string;
    }

    const rows = (sales as unknown as SaleExportItem[]).map((sale) => [
      escapeCsv(sale.invoiceNumber),
      escapeCsv(new Date(sale.createdAt).toISOString().split("T")[0]),
      escapeCsv(sale.customer ? sale.customer.name : "সাধারণ ক্রেতা"),
      escapeCsv(sale.customer ? sale.customer.phone || "" : ""),
      escapeCsv(fromPoisha(sale.subtotalPoisha).toFixed(2)),
      escapeCsv(fromPoisha(sale.discountPoisha).toFixed(2)),
      escapeCsv(fromPoisha(sale.totalPoisha).toFixed(2)),
      escapeCsv(fromPoisha(sale.paidPoisha).toFixed(2)),
      escapeCsv(fromPoisha(sale.duePoisha).toFixed(2)),
      escapeCsv(sale.paymentMethod),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

    const filename = `sales_report_${new Date().toISOString().split("T")[0]}.csv`;

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
