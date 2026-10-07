import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  History,
  ArrowLeft,
  Calendar,
  Package,
  SlidersHorizontal,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { calculateRunningStock } from "@/features/products/stock-service";
import { StockMovementType } from "@prisma/client";

export const metadata = {
  title: "পণ্য স্টক ইতিহাস | বাকি",
  description: "পণ্যের স্টক পরিবর্তনের ধারাবাহিক ইতিহাস ও চলমান স্টক",
};

interface HistoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductStockHistoryPage({ params }: HistoryPageProps) {
  const { id } = await params;
  const { db } = await getSessionTenantDb();

  const product = await db.product.findUnique(id);
  if (!product) {
    notFound();
  }

  // Fetch all stock movements chronologically ascending to compute running stock
  const movements = await db.stockMovement.findMany({
    where: { productId: id },
    orderBy: { createdAt: "asc" },
  });

  const movementsWithRunning = calculateRunningStock(movements, 0);
  // Reverse for display: latest on top
  const displayMovements = [...movementsWithRunning].reverse();

  return (
    <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <History className="h-6 w-6 text-emerald-600" />
              স্টক ইতিহাস ও মুভমেন্ট
            </h1>
            <p className="text-sm text-zinc-500">
              {product.name} — বিস্তারিত স্টকের পরিবর্তন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/products/adjust?productId=${product.id}`}>
            <Button variant="outline" className="rounded-xl gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              স্টক সমন্বয়
            </Button>
          </Link>
          <Link href="/purchases/new">
            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium">
              <Truck className="h-4 w-4" />
              নতুন ক্রয়
            </Button>
          </Link>
        </div>
      </div>

      {/* Product Summary Header Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-zinc-500 font-medium">বর্তমান মজুদ স্টক</span>
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1">
              {toBanglaDigits(product.cachedStock)}{" "}
              <span className="text-sm font-semibold text-zinc-500">
                {product.unit}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-zinc-500 font-medium">সতর্কতা লেভেল</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {toBanglaDigits(product.lowStockThreshold)}{" "}
              <span className="text-sm font-medium text-zinc-500">{product.unit}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-zinc-500 font-medium">ক্রয় মূল্য (দর)</span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {formatMoneyBn(product.buyPricePoisha)}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs text-zinc-500 font-medium">বিক্রয় মূল্য</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatMoneyBn(product.sellPricePoisha)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            স্টক মুভমেন্টের তালিকা ({toBanglaDigits(displayMovements.length)})
          </CardTitle>
          <Badge variant="outline" className="rounded-lg text-xs">
            সর্বশেষ উপরে
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {displayMovements.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <Package className="h-10 w-10 mx-auto stroke-1 opacity-50 mb-2" />
              <p className="text-sm">এখনও কোন স্টক মুভমেন্ট রেকর্ড হয়নি।</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">তারিখ ও সময়</th>
                    <th className="py-3.5 px-4">ধরন (Type)</th>
                    <th className="py-3.5 px-4">বিবরণ / রেফারেন্স</th>
                    <th className="py-3.5 px-4 text-right">পরিবর্তন (Qty)</th>
                    <th className="py-3.5 px-4 text-right">চলমান স্টক (Running)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {displayMovements.map((m) => {
                    const isPositive = m.quantity > 0;
                    const dateFormatted = new Date(m.createdAt).toLocaleDateString(
                      "bn-BD",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    );

                    let badgeColor = "bg-zinc-100 text-zinc-700";
                    let typeLabel: string = m.movementType;

                    if (m.movementType === StockMovementType.PURCHASE) {
                      badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
                      typeLabel = "পণ্য ক্রয় (+)";
                    } else if (m.movementType === StockMovementType.SALE) {
                      badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
                      typeLabel = "পণ্য বিক্রি (-)";
                    } else if (m.movementType === StockMovementType.DAMAGE) {
                      badgeColor = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
                      typeLabel = "নষ্ট / ড্যামেজ (-)";
                    } else if (m.movementType === StockMovementType.ADJUSTMENT) {
                      badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
                      typeLabel = "সমন্বয় (Adjustment)";
                    } else if (m.movementType === StockMovementType.RETURN_CUSTOMER) {
                      badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
                      typeLabel = "কাস্টমার ফেরত (+)";
                    } else if (m.movementType === StockMovementType.RETURN_SUPPLIER) {
                      badgeColor = "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300";
                      typeLabel = "মহাজন ফেরত (-)";
                    }

                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                            {dateFormatted}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${badgeColor}`}
                          >
                            {typeLabel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-zinc-700 dark:text-zinc-300">
                          {m.note || "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-sm">
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                            {isPositive ? "+" : ""}
                            {toBanglaDigits(m.quantity)} {product.unit}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-sm text-zinc-900 dark:text-zinc-100">
                          {toBanglaDigits(m.runningStock)} {product.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
