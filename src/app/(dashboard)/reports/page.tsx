import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Receipt,
  Truck,
  BookOpen,
  HandCoins,
  Package,
  Filter,
} from "lucide-react";
import { calculateEstimatedProfit } from "@/features/reports/profit";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "হিসাব ও রিপোর্ট | বাকি",
  description: "দোকানের দৈনিক ও মাসিক বিক্রয়, ক্রয়, লাভ ও বকেয়ার সমন্বিত রিপোর্ট",
};

interface ReportsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { db } = await getSessionTenantDb();
  const params = await searchParams;

  const now = new Date();
  let fromDate: Date;
  let toDate: Date;
  const preset = params.preset || (params.from ? "custom" : "this_month");

  if (preset === "today") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (preset === "last_7_days") {
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (preset === "last_month") {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (preset === "all") {
    fromDate = new Date(2020, 0, 1);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (params.from && params.to) {
    fromDate = new Date(params.from);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
  } else {
    // Default: this month
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const fromIsoStr = fromDate.toISOString().split("T")[0];
  const toIsoStr = toDate.toISOString().split("T")[0];

  // Parallel fetch tenant queries for the period
  const [
    salesAgg,
    purchasesAgg,
    paymentsAgg,
    salesWithItems,
    allProducts,
    allCustomers,
    allSuppliers,
  ] = await Promise.all([
    // Sales aggregate
    db.sale.aggregate({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        deletedAt: null,
      },
      _sum: {
        totalPoisha: true,
        discountPoisha: true,
        paidPoisha: true,
        duePoisha: true,
      },
      _count: { id: true },
    }),

    // Purchases aggregate
    db.purchase.aggregate({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        deletedAt: null,
      },
      _sum: {
        totalPoisha: true,
        paidPoisha: true,
        duePoisha: true,
      },
      _count: { id: true },
    }),

    // Cash received aggregate
    db.payment.aggregate({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        deletedAt: null,
      },
      _sum: {
        amountPoisha: true,
      },
    }),

    // Sales with items snapshot for profit
    db.sale.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        deletedAt: null,
      },
      select: {
        id: true,
        discountPoisha: true,
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            unitPricePoisha: true,
            buyPricePoisha: true,
          },
        },
      },
    }),

    // Products for inventory asset valuation
    db.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        cachedStock: true,
        buyPricePoisha: true,
        sellPricePoisha: true,
        lowStockThreshold: true,
      },
    }),

    // Total outstanding customer dues
    db.customer.findMany({
      where: { deletedAt: null, cachedBalancePoisha: { gt: 0 } },
      select: { cachedBalancePoisha: true },
    }),

    // Total outstanding supplier dues
    db.supplier.findMany({
      where: { deletedAt: null, cachedBalancePoisha: { gt: 0 } },
      select: { cachedBalancePoisha: true },
    }),
  ]);

  // Aggregate stats
  const totalSalesPoisha = salesAgg._sum.totalPoisha || 0;
  const salesCount = salesAgg._count.id || 0;
  const newDuesPoisha = salesAgg._sum.duePoisha || 0;
  const cashReceivedPoisha = paymentsAgg._sum.amountPoisha || 0;

  const totalPurchasesPoisha = purchasesAgg._sum.totalPoisha || 0;
  const purchasesCount = purchasesAgg._count.id || 0;

  // Profit calculation
  const profitReport = calculateEstimatedProfit(salesWithItems);
  const netProfitPoisha = profitReport.totalNetProfitPoisha;
  const grossProfitPoisha = profitReport.totalGrossProfitPoisha;

  // Total current inventory valuation (asset at cost price)
  const totalInventoryAssetPoisha = allProducts.reduce(
    (sum, p) => sum + Math.max(0, p.cachedStock) * p.buyPricePoisha,
    0
  );

  const totalCustomerDuesPoisha = allCustomers.reduce(
    (sum, c) => sum + c.cachedBalancePoisha,
    0
  );

  const totalSupplierDuesPoisha = allSuppliers.reduce(
    (sum, s) => sum + s.cachedBalancePoisha,
    0
  );

  // Top selling products during this period
  const productSalesMap = new Map<
    string,
    { name: string; quantity: number; revenuePoisha: number; profitPoisha: number }
  >();

  for (const sale of salesWithItems) {
    for (const item of sale.items) {
      const existing = productSalesMap.get(item.productId) || {
        name: item.productName,
        quantity: 0,
        revenuePoisha: 0,
        profitPoisha: 0,
      };

      existing.quantity += item.quantity;
      existing.revenuePoisha += item.quantity * item.unitPricePoisha;
      existing.profitPoisha +=
        item.quantity * (item.unitPricePoisha - item.buyPricePoisha);

      productSalesMap.set(item.productId, existing);
    }
  }

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.revenuePoisha - a.revenuePoisha)
    .slice(0, 5);

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            {t.reports.title}
          </h1>
          <p className="text-sm text-zinc-500">
            দোকানের আর্থিক সারাংশ, লাভ-ক্ষতি ও এক্সেল (CSV) এক্সপোর্ট
          </p>
        </div>

        {/* CSV Export Dropdown / Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/export/sales?from=${fromIsoStr}&to=${toIsoStr}`}
            download
          >
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 h-10 border-zinc-200"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              বিক্রি CSV
            </Button>
          </a>
          <a href="/api/reports/export/dues" download>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 h-10 border-zinc-200"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              বাকি খাতা CSV
            </Button>
          </a>
          <a href="/api/reports/export/stock" download>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 h-10 border-zinc-200"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              স্টক CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Date Filter & Presets Bar */}
      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm p-4 bg-white dark:bg-zinc-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Link href="/reports?preset=today">
              <Button
                variant={preset === "today" ? "default" : "outline"}
                size="sm"
                className={`rounded-xl h-8 px-3 ${
                  preset === "today" ? "bg-emerald-600 text-white" : ""
                }`}
              >
                আজকে
              </Button>
            </Link>
            <Link href="/reports?preset=last_7_days">
              <Button
                variant={preset === "last_7_days" ? "default" : "outline"}
                size="sm"
                className={`rounded-xl h-8 px-3 ${
                  preset === "last_7_days" ? "bg-emerald-600 text-white" : ""
                }`}
              >
                গত ৭ দিন
              </Button>
            </Link>
            <Link href="/reports?preset=this_month">
              <Button
                variant={preset === "this_month" ? "default" : "outline"}
                size="sm"
                className={`rounded-xl h-8 px-3 ${
                  preset === "this_month" ? "bg-emerald-600 text-white" : ""
                }`}
              >
                চলতি মাস
              </Button>
            </Link>
            <Link href="/reports?preset=last_month">
              <Button
                variant={preset === "last_month" ? "default" : "outline"}
                size="sm"
                className={`rounded-xl h-8 px-3 ${
                  preset === "last_month" ? "bg-emerald-600 text-white" : ""
                }`}
              >
                গত মাস
              </Button>
            </Link>
            <Link href="/reports?preset=all">
              <Button
                variant={preset === "all" ? "default" : "outline"}
                size="sm"
                className={`rounded-xl h-8 px-3 ${
                  preset === "all" ? "bg-emerald-600 text-white" : ""
                }`}
              >
                সব সময়
              </Button>
            </Link>
          </div>

          {/* Custom Date Inputs Form */}
          <form method="GET" className="flex items-center gap-2">
            <input type="hidden" name="preset" value="custom" />
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>তারিখ:</span>
            </div>
            <input
              type="date"
              name="from"
              defaultValue={fromIsoStr}
              className="h-8 px-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            />
            <span className="text-zinc-400 text-xs">থেকে</span>
            <input
              type="date"
              name="to"
              defaultValue={toIsoStr}
              className="h-8 px-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg text-xs gap-1"
            >
              <Filter className="h-3 w-3" />
              ফিল্টার
            </Button>
          </form>
        </div>
      </Card>

      {/* KPI Cards: Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">
              মোট বিক্রয় (Sales)
            </span>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {formatMoneyBn(totalSalesPoisha)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              মোট চালান: {toBanglaDigits(salesCount)} টি • নতুন বাকি:{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {formatMoneyBn(newDuesPoisha)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Total Cash Received */}
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">
              নগদ আদায় / কালেকশন
            </span>
            <HandCoins className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatMoneyBn(cashReceivedPoisha)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              নগদ বিক্রয় ও বাকি পরিশোধ
            </p>
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">
              মোট ক্রয় (Purchases)
            </span>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-purple-900 dark:text-purple-200">
              {formatMoneyBn(totalPurchasesPoisha)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              মোট ক্রয় চালান: {toBanglaDigits(purchasesCount)} টি
            </p>
          </CardContent>
        </Card>

        {/* Estimated Net Profit */}
        <Card className="rounded-2xl border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              আনুমানিক নীট লাভ (Profit)
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              className={`text-2xl font-extrabold ${
                netProfitPoisha >= 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatMoneyBn(netProfitPoisha)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              গ্রস লাভ: {formatMoneyBn(grossProfitPoisha)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Sheet Asset Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Inventory Asset Value */}
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>মোট মজুদ পণ্যের মূল্য (Stock Asset)</span>
              <Package className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              {formatMoneyBn(totalInventoryAssetPoisha)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              ক্রয়মূল্য ভিত্তিক মোট ইনভেন্টরি সম্পদ
            </p>
          </CardContent>
        </Card>

        {/* Customer Dues (Receivable) */}
        <Card className="rounded-2xl border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 text-xs font-semibold">
              <span>কাস্টমারদের বকেয়া বাকি (Receivable)</span>
              <BookOpen className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-2">
              {formatMoneyBn(totalCustomerDuesPoisha)}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              দোকানের পাওনা বকেয়া টাকা
            </p>
          </CardContent>
        </Card>

        {/* Supplier Dues (Payable) */}
        <Card className="rounded-2xl border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-rose-800 dark:text-rose-400 text-xs font-semibold">
              <span>মহাজন দেনা (Payable)</span>
              <Truck className="h-4 w-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-900 dark:text-rose-200 mt-2">
              {formatMoneyBn(totalSupplierDuesPoisha)}
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
              মহাজনদের কাছে দোকানের বাকি দেনা
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Products Table */}
      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            সর্বাধিক বিক্রীত পণ্য (নির্বাচিত সময়ে)
          </CardTitle>
          <span className="text-xs text-zinc-500">শীর্ষ ৫ টি</span>
        </CardHeader>
        <CardContent className="p-0">
          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">
              এই সময়সীমায় কোন পণ্য বিক্রি হয়নি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4">পণ্যের নাম</th>
                    <th className="py-3 px-4 text-center">বিক্রিত পরিমাণ</th>
                    <th className="py-3 px-4 text-right">মোট বিক্রি (Revenue)</th>
                    <th className="py-3 px-4 text-right">লাভ (Profit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {topProducts.map((p, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                    >
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-700 dark:text-zinc-300">
                        {toBanglaDigits(p.quantity)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
                        {formatMoneyBn(p.revenuePoisha)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoneyBn(p.profitPoisha)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
