import { getSessionTenantDb } from "@/lib/auth/session";
import { InvoiceView } from "@/features/sales/components/invoice-view";
import { notFound } from "next/navigation";

export default async function SaleInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db } = await getSessionTenantDb();

  const sale = await db.sale.findUnique(id, {
    items: true,
    customer: true,
    shop: true,
    user: true,
  });

  if (!sale) {
    notFound();
  }

  return <InvoiceView sale={sale} />;
}
