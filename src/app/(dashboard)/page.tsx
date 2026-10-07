import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ShoppingCart,
  BookOpen,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Receipt,
  Truck,
  SlidersHorizontal,
  HandCoins,
  Building2,
  Calendar,
} from "lucide-react";
import { calculateEstimatedProfit } from "@/features/reports/profit";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "ড্যাশবোর্ড | বাকি",
  description: "দোকানের আজকের বেচাকেনা, মাসিক হিসাব, লাভ ও বকেয়ার সারাংশ",
};

export default async function DashboardPage() {
  const { db } = await getSessionTenantDb();

  // Date ranges: Today
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Date ranges: This Month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Parallel data fetching for performance (tenant-scoped)
  const [
    todaySalesAgg,
    todayPaymentsAgg,
    monthSalesAgg,
    monthPurchasesAgg,
    monthSalesWithItems,
    topDueCustomers,
    allProducts,
    totalSupplierDueAgg,
  ] = await Promise.all([
    // 1. Today Sales & Dues
    db.sale.aggregate({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        deletedAt: null,
      },
      _sum: {
        totalPoisha: true,
        duePoisha: true,
        paidPoisha: true,
      },
      _count: { id: true },
    }),

    // 2. Today Cash / Payments received
    db.payment.aggregate({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        deletedAt: null,
      },
      _sum: {
        amountPoisha: true,
      },
    }),

    // 3. This Month Sales
    db.sale.aggregate({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: {
        totalPoisha: true,
      },
      _count: { id: true },
    }),

    // 4. This Month Purchases
    db.purchase.aggregate({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: {
        totalPoisha: true,
      },
      _count: { id: true },
    }),

    // 5. This Month Sales with snapshot items for estimated profit
    db.sale.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      select: {
        id: true,
        discountPoisha: true,
        items: {
          select: {
            quantity: true,
            unitPricePoisha: true,
            buyPricePoisha: true,
          },
        },
      },
    }),

    // 6. Top 5 customers by outstanding due
    db.customer.findMany({
      where: {
        cachedBalancePoisha: { gt: 0 },
        deletedAt: null,
      },
      orderBy: { cachedBalancePoisha: "desc" },
      take: 5,
    }),

    // 7. Products for low-stock calculation
    db.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        cachedStock: true,
        lowStockThreshold: true,
        unit: true,
      },
    }),

    // 8. Total supplier due (what I owe suppliers)
    db.supplier.findMany({
      where: { deletedAt: null, cachedBalancePoisha: { gt: 0 } },
      select: { cachedBalancePoisha: true },
    }),
  ]);

  // Calculations
  const todaySalesTotalPoisha = todaySalesAgg._sum.totalPoisha || 0;
  const todayNewDuesPoisha = todaySalesAgg._sum.duePoisha || 0;
  const todayCashReceivedPoisha = todayPaymentsAgg._sum.amountPoisha || 0;
  const todaySalesCount = todaySalesAgg._count.id || 0;

  const monthSalesTotalPoisha = monthSalesAgg._sum.totalPoisha || 0;
  const monthPurchasesTotalPoisha = monthPurchasesAgg._sum.totalPoisha || 0;

  // Estimated Profit: sum(item.quantity * (sellPrice - buyPrice)) - discounts
  const profitReport = calculateEstimatedProfit(monthSalesWithItems);
  const estimatedProfitPoisha = profitReport.totalNetProfitPoisha;

  // Low stock products
  const lowStockProducts = allProducts.filter(
    (p: { cachedStock: number; lowStockThreshold: number }) =>
      p.cachedStock <= p.lowStockThreshold
  );
  const lowStockCount = lowStockProducts.length;

  const totalSupplierPayablePoisha = totalSupplierDueAgg.reduce(
    (sum: number, s: { cachedBalancePoisha: number }) => sum + s.cachedBalancePoisha,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome with quick POS CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-emerald-600 rounded-2xl p-6 text-white shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            আজকের ব্যবসার হিসাব-নিকাশ
          </h2>
          <p className="text-emerald-100 text-sm mt-1">
            সহজেই বেচাকেনা ও মালামাল ক্রয় পরিচালনা করুন
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/purchases/new"
            className="inline-flex items-center gap-2 bg-emerald-700/80 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Truck className="w-4 h-4" />
            নতুন ক্রয়
          </Link>
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-2 bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            {t.nav.billing}
          </Link>
        </div>
      </div>

      {/* SECTION 1: TODAY'S METRICS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            আজকের হিসাব (Today)
          </h3>
          <span className="text-xs text-zinc-400">
            {now.toLocaleDateString("bn-BD", { day: "numeric", month: "long" })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today Sales */}
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                আজকের মোট বিক্রি
              </span>
              <Receipt className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                {formatMoneyBn(todaySalesTotalPoisha)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                মোট চালান: {toBanglaDigits(todaySalesCount)} টি
              </p>
            </CardContent>
          </Card>

          {/* Today Cash Received */}
          <Card className="rounded-2xl border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                আজকের নগদ গ্রহণ / আদায়
              </span>
              <HandCoins className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
                {formatMoneyBn(todayCashReceivedPoisha)}
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                নগদ বিক্রি ও বাকি কালেকশন
              </p>
            </CardContent>
          </Card>

          {/* Today New Dues */}
          <Card className="rounded-2xl border-amber-200/60 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                আজকের নতুন বাকি
              </span>
              <BookOpen className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-amber-900 dark:text-amber-200">
                {formatMoneyBn(todayNewDuesPoisha)}
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                আজকে নতুন যুক্ত হওয়া বাকি
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 2: THIS MONTH'S METRICS & ESTIMATED PROFIT */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            চলতি মাসের হিসাব ও লাভ (This Month)
          </h3>
          <span className="text-xs text-zinc-400">
            {now.toLocaleDateString("bn-BD", { month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Month Sales */}
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                চলতি মাসের বিক্রি
              </span>
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                {formatMoneyBn(monthSalesTotalPoisha)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                মাসের মোট বিক্রির পরিমাণ
              </p>
            </CardContent>
          </Card>

          {/* Month Purchases */}
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                চলতি মাসের ক্রয় (ইনভেন্টরি)
              </span>
              <Truck className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-black text-purple-900 dark:text-purple-200">
                {formatMoneyBn(monthPurchasesTotalPoisha)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                সাপ্লায়ারদের কাছ থেকে মালামাল ক্রয়
              </p>
            </CardContent>
          </Card>

          {/* Estimated Profit */}
          <Card className="rounded-2xl border-emerald-300 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/20 shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                আনুমানিক মোট লাভ (Estimated Profit)
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div
                className={`text-2xl font-extrabold ${
                  estimatedProfitPoisha >= 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatMoneyBn(estimatedProfitPoisha)}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                বিক্রয়মূল্য মাইনাস ক্রয়মূল্যের পার্থক্য
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 3: TOP 5 CUSTOMERS BY OUTSTANDING DUE & LOW STOCK COUNT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 Customers Due */}
        <div className="lg:col-span-8">
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
            <CardHeader className="p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  শীর্ষ ৫ বাকিদার কাস্টমার (Top 5 Dues)
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  সবচেয়ে বেশি বাকি থাকা কাস্টমারদের তালিকা
                </p>
              </div>
              <Link href="/due-list">
                <Button variant="ghost" size="sm" className="text-xs rounded-xl gap-1 text-emerald-600">
                  সম্পূর্ণ বাকি খাতা
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {topDueCustomers.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <BookOpen className="h-8 w-8 mx-auto stroke-1 opacity-50 mb-2" />
                  <p className="text-sm">কারো কাছে বকেয়া বাকি নেই!</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {topDueCustomers.map(
                    (
                      customer: {
                        id: string;
                        name: string;
                        phone?: string | null;
                        cachedBalancePoisha: number;
                      },
                      index: number
                    ) => (
                    <div
                      key={customer.id}
                      className="p-4 flex items-center justify-between hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center">
                          {toBanglaDigits(index + 1)}
                        </span>
                        <div>
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 transition"
                          >
                            {customer.name}
                          </Link>
                          {customer.phone && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {customer.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                          {formatMoneyBn(customer.cachedBalancePoisha)}
                        </span>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="block text-[11px] text-zinc-400 hover:text-zinc-700 mt-0.5"
                        >
                          খাতা দেখুন →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Low Stock Alert Card & Supplier Dues */}
        <div className="lg:col-span-4 space-y-4">
          {/* Low Stock Banner Card */}
          <Card className="rounded-2xl border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  স্টক সতর্কতা
                </span>
                <Badge
                  variant={lowStockCount > 0 ? "destructive" : "outline"}
                  className="rounded-lg text-xs font-bold"
                >
                  {toBanglaDigits(lowStockCount)} টি
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                কম স্টক পণ্য
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {lowStockCount > 0
                  ? `মোট ${toBanglaDigits(lowStockCount)} টি পণ্যের মজুদ সতর্কতা সীমার নিচে। দ্রুত ক্রয় করুন।`
                  : "সব পণ্যের মজুদ সন্তোষজনক।"}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Link href="/products/low-stock" className="flex-1">
                  <Button
                    size="sm"
                    className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    কম স্টক তালিকা দেখুন
                  </Button>
                </Link>
                <Link href="/products/adjust">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs"
                    title="স্টক সমন্বয়"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Payables Card */}
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="p-5 pb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-zinc-600" />
                মহাজন দেনা (Supplier Dues)
              </span>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {formatMoneyBn(totalSupplierPayablePoisha)}
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p className="text-xs text-zinc-500 mb-3">
                দোকান থেকে মহাজনদের যে টাকা পরিশোধ করতে হবে
              </p>
              <Link href="/suppliers/due-list">
                <Button variant="outline" size="sm" className="w-full rounded-xl text-xs gap-1.5">
                  মহাজন দেনা তালিকা
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
