import { getSessionTenantDb } from "@/lib/auth/session";
import { StockAdjustmentForm } from "@/features/products/components/stock-adjustment-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";

export const metadata = {
  title: "স্টক সমন্বয় | বাকি",
  description: "পণ্যের স্টক কমানো বা বাড়ানোর স্ক্রিন",
};

interface AdjustPageProps {
  searchParams: Promise<{
    productId?: string;
  }>;
}

export default async function StockAdjustPage({ searchParams }: AdjustPageProps) {
  const { db } = await getSessionTenantDb();
  const params = await searchParams;

  const products = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  const selectedProduct = params.productId
    ? products.find((p) => p.id === params.productId) || null
    : null;

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/products">
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-emerald-600" />
            স্টক সমন্বয় (Stock Adjustment)
          </h1>
          <p className="text-sm text-zinc-500">
            নষ্ট, ড্যামেজ বা গণনা সংশোধনের জন্য স্টক আপডেট করুন
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900 p-6">
        <StockAdjustmentForm
          product={selectedProduct}
          products={products}
        />
      </Card>
    </div>
  );
}
