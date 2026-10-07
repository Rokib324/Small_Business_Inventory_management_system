import { getSessionTenantDb } from "@/lib/auth/session";
import { DueListView } from "@/features/due-list/components/due-list-view";

export default async function DueListPage() {
  const { db } = await getSessionTenantDb();

  const dueCustomers = await db.customer.findMany({
    where: {
      cachedBalancePoisha: { gt: 0 },
    },
    orderBy: {
      cachedBalancePoisha: "desc",
    },
  });

  return <DueListView customers={dueCustomers} />;
}
