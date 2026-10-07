import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { generateInvoicePdf } from "@/features/sales/pdf-service";
import { verifyInvoiceShareToken } from "@/lib/invoice/token";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: saleId } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const format = (searchParams.get("format") || "a4") as "a4" | "thermal";

    let shopId: string | null = null;

    // Check if token provided (public signed link)
    if (token) {
      const verification = verifyInvoiceShareToken(token);
      if (!verification.valid || !verification.payload) {
        return NextResponse.json(
          { error: verification.error || "অবৈধ বা মেয়াদোত্তীর্ণ লিঙ্ক" },
          { status: 403 }
        );
      }
      if (verification.payload.saleId !== saleId) {
        return NextResponse.json({ error: "চালান আইডি মেলেনি" }, { status: 403 });
      }
      shopId = verification.payload.shopId;
    } else {
      // Must be authenticated user session
      const session = await auth();
      if (!session?.user?.shopId) {
        return NextResponse.json({ error: "অননুমোদিত অ্যাক্সেস" }, { status: 401 });
      }
      shopId = session.user.shopId;
    }

    if (!shopId) {
      return NextResponse.json({ error: "অননুমোদিত অ্যাক্সেস" }, { status: 401 });
    }

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, shopId, deletedAt: null },
      select: { invoiceNumber: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "চালান পাওয়া যায়নি" }, { status: 404 });
    }

    const pdfBuffer = await generateInvoicePdf({
      saleId,
      shopId,
      format,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${sale.invoiceNumber}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF তৈরিতে সমস্যা হয়েছে";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
