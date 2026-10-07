import { getSessionTenantDb } from "@/lib/auth/session";
import { CustomerListView } from "@/features/customers/components/customer-list-view";

export default async function CustomersPage() {
  const { db } = await getSessionTenantDb();

  const customers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <CustomerListView customers={customers} />;
}
