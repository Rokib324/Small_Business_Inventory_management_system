import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Truck, Plus, Search, Eye, Calendar, Building2 } from "lucide-react";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "ক্রয় তালিকা | বাকি",
  description: "দোকানের সকল মালামাল ক্রয়ের তালিকা ও হিসাব",
};

interface PurchaseListItem {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  totalPoisha: number;
  paidPoisha: number;
  duePoisha: number;
  items: Array<{ id: string }>;
  supplier: {
    name: string;
    companyName: string | null;
  } | null;
}

interface PurchasesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function PurchasesPage({ searchParams }: PurchasesPageProps) {
  const { db } = await getSessionTenantDb();
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page || "1", 10));
  const search = params.search?.trim() || "";
  const limit = 15;
  const skip = (page - 1) * limit;

  const whereClause: {
    deletedAt: null;
    OR?: Array<{
      invoiceNumber?: { contains: string; mode: "insensitive" };
      supplier?: {
        name?: { contains: string; mode: "insensitive" };
        companyName?: { contains: string; mode: "insensitive" };
      };
    }>;
  } = {
    deletedAt: null,
  };

  if (search) {
    whereClause.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
      { supplier: { companyName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [purchases, totalCount, totalsAggregate] = await Promise.all([
    db.purchase.findMany({
      where: whereClause,
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.purchase.count(whereClause),
    db.purchase.aggregate({
      where: { deletedAt: null },
      _sum: {
        totalPoisha: true,
        paidPoisha: true,
        duePoisha: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const totalPurchasesPoisha = totalsAggregate._sum.totalPoisha || 0;
  const totalPaidPoisha = totalsAggregate._sum.paidPoisha || 0;
  const totalDuePoisha = totalsAggregate._sum.duePoisha || 0;

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-600" />
            {t.purchases.title}
          </h1>
          <p className="text-sm text-zinc-500">
            দোকানের মোট ক্রয় ও মহাজনদের দেনার হিসাব
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/suppliers/due-list">
            <Button variant="outline" className="rounded-xl gap-2">
              <Building2 className="h-4 w-4" />
              মহাজন বাকি খাতা
            </Button>
          </Link>
          <Link href="/purchases/new">
            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium">
              <Plus className="h-4 w-4" />
              {t.purchases.newPurchase}
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              সর্বমোট ক্রয় মূল্য
            </span>
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1">
              {formatMoneyBn(totalPurchasesPoisha)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              মোট চালান: {toBanglaDigits(totalCount)} টি
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              মোট পরিশোধ (নগদ)
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatMoneyBn(totalPaidPoisha)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">সাপ্লায়ারদের প্রদত্ত নগদ</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              মোট বাকি দেনা
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {formatMoneyBn(totalDuePoisha)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">মহাজনদের পাওনা অর্থ</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <form method="GET" className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
          <input
            name="search"
            defaultValue={search}
            placeholder="চালান নং বা মহাজনের নাম দিয়ে খুঁজুন..."
            className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </form>
      </div>

      {/* Purchases Table */}
      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {purchases.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <Truck className="h-10 w-10 mx-auto stroke-1 opacity-50 mb-2" />
              <p className="text-sm">কোন ক্রয় চালান পাওয়া যায়নি।</p>
              <Link href="/purchases/new" className="mt-3 inline-block">
                <Button size="sm" variant="outline" className="rounded-xl">
                  প্রথম ক্রয় এন্ট্রি করুন
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">চালান নং ও তারিখ</th>
                    <th className="py-3.5 px-4">সাপ্লায়ার / মহাজন</th>
                    <th className="py-3.5 px-4 text-center">পণ্য সংখ্যা</th>
                    <th className="py-3.5 px-4 text-right">মোট বিল</th>
                    <th className="py-3.5 px-4 text-right">পরিশোধ</th>
                    <th className="py-3.5 px-4 text-right">বাকি (দেনা)</th>
                    <th className="py-3.5 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(purchases as unknown as PurchaseListItem[]).map((p) => {
                    const dateFormatted = new Date(p.createdAt).toLocaleDateString("bn-BD", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {p.invoiceNumber}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {dateFormatted}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {p.supplier ? (
                            <div>
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {p.supplier.name}
                              </div>
                              {p.supplier.companyName && (
                                <div className="text-xs text-zinc-500">
                                  {p.supplier.companyName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 italic">
                              সাধারণ নগদ ক্রয়
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="outline" className="rounded-lg">
                            {toBanglaDigits(p.items.length)} আইটেম
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatMoneyBn(p.totalPoisha)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoneyBn(p.paidPoisha)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {p.duePoisha > 0 ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {formatMoneyBn(p.duePoisha)}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              পরিশোধিত
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Link href={`/purchases/${p.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg text-zinc-500 hover:text-zinc-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500 pt-2">
          <span>
            পৃষ্ঠা {toBanglaDigits(page)} এর {toBanglaDigits(totalPages)}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={`/purchases?page=${page - 1}&search=${search}`}>
                <Button variant="outline" size="sm" className="rounded-xl">
                  পূর্ববর্তী
                </Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/purchases?page=${page + 1}&search=${search}`}>
                <Button variant="outline" size="sm" className="rounded-xl">
                  পরবর্তী
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
