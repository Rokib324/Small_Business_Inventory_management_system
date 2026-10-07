import { getSessionTenantDb } from "@/lib/auth/session";
import { NewSalePos } from "@/features/sales/components/new-sale-pos";

export default async function NewSalePage() {
  const { db } = await getSessionTenantDb();

  const [products, customers] = await Promise.all([
    db.product.findMany({
      orderBy: { name: "asc" },
    }),
    db.customer.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return <NewSalePos products={products} customers={customers} />;
}
