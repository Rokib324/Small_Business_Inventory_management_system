import { getSessionTenantDb } from "@/lib/auth/session";
import { CustomerLedgerView } from "@/features/ledger/components/customer-ledger-view";
import { notFound } from "next/navigation";

export default async function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db } = await getSessionTenantDb();

  const [customer, entries] = await Promise.all([
    db.customer.findUnique(id),
    db.ledger.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!customer) {
    notFound();
  }

  return <CustomerLedgerView customer={customer} entries={entries} />;
}
