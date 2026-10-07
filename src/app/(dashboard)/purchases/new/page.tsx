import { getSessionTenantDb } from "@/lib/auth/session";
import { NewPurchaseForm } from "@/features/purchases/components/new-purchase-form";

export const metadata = {
  title: "নতুন পণ্য ক্রয় | বাকি",
  description: "মহাজনের কাছ থেকে নতুন পণ্য ক্রয় ও স্টক বৃদ্ধি",
};

export default async function NewPurchasePage() {
  const { db } = await getSessionTenantDb();

  // Fetch active products and suppliers for this shop
  const [products, suppliers] = await Promise.all([
    db.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    db.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <NewPurchaseForm products={products} suppliers={suppliers} />
    </div>
  );
}
