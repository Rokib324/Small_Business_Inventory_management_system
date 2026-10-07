import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ShoppingCart,
  BookOpen,
  Users,
  Package,
  AlertTriangle,
  ArrowRight,
  Receipt,
  PlusCircle,
} from "lucide-react";
import { t } from "@/lib/i18n";

export default async function DashboardPage() {
  const { db } = await getSessionTenantDb();

  // Fetch KPI data
  const [
    customers,
    products,
    recentSales,
    totalSalesCount,
  ] = await Promise.all([
    db.customer.findMany({ select: { cachedBalancePoisha: true } }),
    db.product.findMany({
      select: { cachedStock: true, lowStockThreshold: true },
    }),
    db.sale.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    }),
    db.sale.count(),
  ]);

  const totalCustomers = customers.length;
  const customersWithDue = customers.filter((c) => c.cachedBalancePoisha > 0).length;
  const totalDuePoisha = customers.reduce(
    (sum, c) => sum + (c.cachedBalancePoisha > 0 ? c.cachedBalancePoisha : 0),
    0
  );

  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (p) => p.cachedStock <= p.lowStockThreshold
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-emerald-600 rounded-2xl p-6 text-white shadow-md">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">
            আজকের ব্যবসার হিসাব-নিকাশ
          </h2>
          <p className="text-emerald-100 text-sm mt-1">
            সহজেই বেচাকেনা করুন এবং বাকি খাতা নির্ভুল রাখুন
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-2 bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            নতুন বিক্রি (POS)
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Outstanding Due */}
        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
              মোট বকেয়া বাকি
            </span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-black text-amber-900 dark:text-amber-200">
              {formatMoneyBn(totalDuePoisha)}
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
              {toBanglaDigits(customersWithDue)} জন কাস্টমারের বাকি আছে
            </p>
          </CardContent>
        </Card>

        {/* Total Sales Count */}
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              মোট বিক্রির চালান
            </span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {toBanglaDigits(totalSalesCount)} টি
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              সম্পন্ন লেনদেন
            </p>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              কাস্টমার সংখ্যা
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {toBanglaDigits(totalCustomers)} জন
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              তালিকাভুক্ত খদ্দের
            </p>
          </CardContent>
        </Card>

        {/* Products & Low stock */}
        <Card className={lowStockCount > 0 ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20" : ""}>
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              পণ্য ও স্টক
            </span>
            <Package className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {toBanglaDigits(totalProducts)} টি
            </div>
            {lowStockCount > 0 ? (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                {toBanglaDigits(lowStockCount)} টি পণ্যে স্টক কম!
              </p>
            ) : (
              <p className="text-[11px] text-zinc-500 mt-1">
                স্টক পর্যাপ্ত আছে
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/sales/new"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-zinc-900 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-center transition shadow-2xs group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mb-2 group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            নতুন বিক্রি
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">দ্রুত চালান তৈরি</span>
        </Link>

        <Link
          href="/due-list"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-zinc-900 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-center transition shadow-2xs group"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 mb-2 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            বাকি খাতা
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">বকেয়া আদায় দেখুন</span>
        </Link>

        <Link
          href="/customers"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-zinc-900 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-center transition shadow-2xs group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 mb-2 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            কাস্টমার খাতা
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">নতুন খদ্দের যোগ</span>
        </Link>

        <Link
          href="/products"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-zinc-900 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-center transition shadow-2xs group"
        >
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 mb-2 group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            পণ্য ও স্টক
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">মজুত পর্যবেক্ষণ</span>
        </Link>
      </div>

      {/* Recent Sales Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold">
              সাম্প্রতিক বিক্রি চালান
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-0.5">
              সর্বশেষ সম্পন্ন হওয়া কেনাবেচা
            </p>
          </div>
          <Link
            href="/sales"
            className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
          >
            সব দেখুন <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              এখনও কোন বিক্রির চালান নেই। প্রথম বিক্রি শুরু করতে{" "}
              <Link href="/sales/new" className="text-emerald-600 font-semibold underline">
                এখানে ক্লিক করুন
              </Link>
              ।
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-4 flex items-center justify-between hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {sale.invoiceNumber}
                      </span>
                      {sale.duePoisha > 0 ? (
                        <Badge variant="warning">বাকি আছে</Badge>
                      ) : (
                        <Badge variant="success">পরিশোধিত</Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {sale.customer ? sale.customer.name : t.sales.walkInCustomer}
                    </p>
                  </div>

                  <div className="text-right space-y-0.5">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {formatMoneyBn(sale.totalPoisha)}
                    </p>
                    {sale.duePoisha > 0 && (
                      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        বাকি: {formatMoneyBn(sale.duePoisha)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
