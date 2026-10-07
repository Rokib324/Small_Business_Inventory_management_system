import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Truck,
  SlidersHorizontal,
  History,
  PackageCheck,
} from "lucide-react";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "কম স্টক পণ্য তালিকা | বাকি",
  description: "যে সকল পণ্যের স্টক সতর্কতা লেভেলের নিচে নেমে গেছে",
};

export default async function LowStockPage() {
  const { db } = await getSessionTenantDb();

  // Fetch products and filter those at or below lowStockThreshold
  const allProducts = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { cachedStock: "asc" },
  });

  const lowStockProducts = allProducts.filter(
    (p) => p.cachedStock <= p.lowStockThreshold
  );

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
              <AlertTriangle className="h-6 w-6 text-rose-600" />
              {t.nav.lowStock}
            </h1>
            <p className="text-sm text-zinc-500">
              যে সকল পণ্যের স্টক সতর্কতা সীমার সমান বা নিচে
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/purchases/new">
            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium">
              <Truck className="h-4 w-4" />
              পণ্য ক্রয় চালান
            </Button>
          </Link>
          <Link href="/products/adjust">
            <Button variant="outline" className="rounded-xl gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              স্টক সমন্বয়
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Alert Banner */}
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
        <div className="flex items-center gap-3 text-rose-800 dark:text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">
            বর্তমানে মোট{" "}
            <strong className="font-bold underline">
              {toBanglaDigits(lowStockProducts.length)} টি পণ্যের
            </strong>{" "}
            স্টক কম রয়েছে। দ্রুত মালামাল ক্রয়ের ব্যবস্থা নিন।
          </span>
        </div>
      </div>

      {/* Low Stock Table */}
      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardContent className="p-0">
          {lowStockProducts.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <PackageCheck className="h-12 w-12 mx-auto stroke-1 text-emerald-500 mb-2" />
              <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                কোন পণ্যের স্টক কম নেই!
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                দোকানের সকল পণ্যের স্টক সন্তোষজনক অবস্থায় রয়েছে।
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">পণ্যের নাম</th>
                    <th className="py-3.5 px-4 text-center">একক</th>
                    <th className="py-3.5 px-4 text-center">সতর্কতা লেভেল</th>
                    <th className="py-3.5 px-4 text-center">বর্তমান স্টক</th>
                    <th className="py-3.5 px-4 text-right">ক্রয় দর</th>
                    <th className="py-3.5 px-4 text-right">বিক্রয় দর</th>
                    <th className="py-3.5 px-4 text-center">করণীয়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {lowStockProducts.map((p) => {
                    const isZeroOrNegative = p.cachedStock <= 0;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {p.name}
                          </div>
                          {p.sku && (
                            <div className="text-xs text-zinc-400 font-mono mt-0.5">
                              {p.sku}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="outline" className="rounded-lg">
                            {p.unit}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-center text-zinc-500 font-medium">
                          {toBanglaDigits(p.lowStockThreshold)} {p.unit}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isZeroOrNegative
                                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200"
                                : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200"
                            }`}
                          >
                            {isZeroOrNegative ? "স্টক শেষ (" : ""}
                            {toBanglaDigits(p.cachedStock)} {p.unit}
                            {isZeroOrNegative ? ")" : ""}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-zinc-600 dark:text-zinc-400">
                          {formatMoneyBn(p.buyPricePoisha)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatMoneyBn(p.sellPricePoisha)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link href="/purchases/new">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg text-xs gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                ক্রয়
                              </Button>
                            </Link>
                            <Link href={`/products/adjust?productId=${p.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg text-xs gap-1 text-zinc-600 hover:text-zinc-900"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                সমন্বয়
                              </Button>
                            </Link>
                            <Link href={`/products/${p.id}/history`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-900"
                              >
                                <History className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
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
