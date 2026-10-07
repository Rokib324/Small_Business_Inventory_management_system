import { getSessionTenantDb } from "@/lib/auth/session";
import { SupplierListView } from "@/features/suppliers/components/supplier-list-view";

export default async function SuppliersPage() {
  const { db } = await getSessionTenantDb();

  const suppliers = await db.supplier.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <SupplierListView suppliers={suppliers} />;
}
