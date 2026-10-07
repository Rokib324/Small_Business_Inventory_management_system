import { getSessionTenantDb } from "@/lib/auth/session";
import { ProductListView } from "@/features/products/components/product-list-view";

export default async function ProductsPage() {
  const { db } = await getSessionTenantDb();

  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <ProductListView products={products} />;
}
