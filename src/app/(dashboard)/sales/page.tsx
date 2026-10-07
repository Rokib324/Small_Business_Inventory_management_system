import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShoppingCart, Receipt, ArrowRight } from "lucide-react";
import { t } from "@/lib/i18n";

export default async function SalesHistoryPage() {
  const { db } = await getSessionTenantDb();

  const sales = await db.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, phone: true } },
    },
  });

  const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalPoisha, 0);
  const totalDueAmount = sales.reduce((sum, s) => sum + s.duePoisha, 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-emerald-600" />
            {t.nav.sales}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            মোট চালান: {toBanglaDigits(sales.length)} টি | মোট বিক্রি:{" "}
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {formatMoneyBn(totalSalesAmount)}
            </span>{" "}
            | বকেয়া বাকি:{" "}
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {formatMoneyBn(totalDueAmount)}
            </span>
          </p>
        </div>

        <Link href="/sales/new">
          <Button className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            নতুন বিক্রি (POS)
          </Button>
        </Link>
      </div>

      {/* Sales List Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {sales.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              কোন বিক্রির চালান নেই। প্রথম বিক্রি শুরু করতে{" "}
              <Link href="/sales/new" className="text-emerald-600 font-semibold underline">
                এখানে ক্লিক করুন
              </Link>
              ।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">চালান নং</th>
                    <th className="px-4 py-3.5 font-semibold">ক্রেতার নাম</th>
                    <th className="px-4 py-3.5 font-semibold">তারিখ</th>
                    <th className="px-4 py-3.5 font-semibold text-right">সর্বমোট</th>
                    <th className="px-4 py-3.5 font-semibold text-right">জমা</th>
                    <th className="px-4 py-3.5 font-semibold text-right">বাকি</th>
                    <th className="px-4 py-3.5 font-semibold text-center">অবস্থা</th>
                    <th className="px-4 py-3.5 font-semibold text-right">চালান</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {sales.map((s) => {
                    const formattedDate = new Date(s.createdAt).toLocaleDateString(
                      "bn-BD",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    );

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                      >
                        <td className="px-4 py-3.5 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {s.invoiceNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {s.customer ? s.customer.name : t.sales.walkInCustomer}
                          </span>
                          {s.customer?.phone && (
                            <span className="block text-[11px] text-zinc-400">
                              {s.customer.phone}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500">
                          {formattedDate}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatMoneyBn(s.totalPoisha)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-zinc-600 dark:text-zinc-400">
                          {formatMoneyBn(s.paidPoisha)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold">
                          {s.duePoisha > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              {formatMoneyBn(s.duePoisha)}
                            </span>
                          ) : (
                            <span className="text-zinc-400">৳ ০</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {s.duePoisha > 0 ? (
                            <Badge variant="warning">বাকি</Badge>
                          ) : (
                            <Badge variant="success">পরিশোধিত</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/sales/${s.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                          >
                            রসিদ <ArrowRight className="w-3.5 h-3.5" />
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
    </div>
  );
}
