import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Truck, ArrowLeft, ShoppingCart, Building, Phone, MapPin } from "lucide-react";

export default async function SupplierDueListPage() {
  const { db } = await getSessionTenantDb();

  const dueSuppliers = await db.supplier.findMany({
    where: {
      cachedBalancePoisha: { gt: 0 },
    },
    orderBy: {
      cachedBalancePoisha: "desc",
    },
  });

  const totalPayablePoisha = dueSuppliers.reduce(
    (sum, s) => sum + s.cachedBalancePoisha,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-500/10 border border-purple-200 dark:border-purple-900/50 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/suppliers"
              className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Truck className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl md:text-2xl font-black text-purple-950 dark:text-purple-200">
              মহাজন দেনা খাতা (Supplier Due List)
            </h1>
          </div>
          <p className="text-xs text-purple-800/80 dark:text-purple-400 ml-8">
            সাপ্লায়ার বা মহাজনদের পাওনা তালিকা — সর্বাধিক দেনা থেকে সাজানো
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs font-semibold text-purple-800 dark:text-purple-300 block">
            দোকানের মোট মহাজন দেনা:
          </span>
          <span className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400">
            {formatMoneyBn(totalPayablePoisha)}
          </span>
          <span className="text-xs text-purple-700 dark:text-purple-400 block mt-0.5">
            ({toBanglaDigits(dueSuppliers.length)} জন মহাজনের পাওনা রয়েছে)
          </span>
        </div>
      </div>

      {/* Due Suppliers Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {dueSuppliers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              বর্তমানে কোনো মহাজনের দেনা বকেয়া নেই। সব হিসাব পরিশোধিত!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">নং</th>
                    <th className="px-4 py-3.5 font-semibold">মহাজন ও প্রতিষ্ঠান</th>
                    <th className="px-4 py-3.5 font-semibold">মোবাইল নম্বর</th>
                    <th className="px-4 py-3.5 font-semibold text-right">বকেয়া দেনা (Payable)</th>
                    <th className="px-4 py-3.5 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {dueSuppliers.map((s, index) => (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-4 py-3.5 text-center text-zinc-400 font-mono text-xs">
                        {toBanglaDigits(index + 1)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {s.name}
                        </span>
                        {s.companyName && (
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3" />
                            {s.companyName}
                          </div>
                        )}
                        {s.address && (
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {s.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.phone ? (
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-zinc-400" />
                            {s.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-base text-rose-600 dark:text-rose-400">
                        {formatMoneyBn(s.cachedBalancePoisha)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/purchases/new?supplierId=${s.id}`}>
                          <Button size="sm" className="gap-1.5 h-8 text-xs font-semibold">
                            <ShoppingCart className="h-3.5 w-3.5" />
                            নতুন ক্রয় চালান
                          </Button>
                        </Link>
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
