import { getSessionTenantDb } from "@/lib/auth/session";
import { PaymentsListView } from "@/features/payments/components/payments-list-view";

export default async function PaymentsPage() {
  const { db } = await getSessionTenantDb();

  const [payments, customers] = await Promise.all([
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
      },
    }),
    db.customer.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return <PaymentsListView payments={payments} customers={customers} />;
}
