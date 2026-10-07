import { getSessionTenantDb } from "@/lib/auth/session";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Truck,
  ArrowLeft,
  Calendar,
  Building2,
  User,
  CreditCard,
} from "lucide-react";

export const metadata = {
  title: "ক্রয় চালান বিবরণ | বাকি",
  description: "ক্রয় চালানের বিস্তারিত বিবরণ",
};

interface PurchaseItemDetail {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  buyPricePoisha: number;
  subtotalPoisha: number;
}

interface PurchaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseDetailPage({ params }: PurchaseDetailPageProps) {
  const { id } = await params;
  const { db } = await getSessionTenantDb();

  const purchase = await db.purchase.findUnique(id, {
    supplier: true,
    items: {
      include: {
        product: true,
      },
    },
    user: {
      select: {
        name: true,
        phone: true,
      },
    },
  });

  if (!purchase) {
    notFound();
  }

  const dateFormatted = new Date(purchase.createdAt).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/purchases">
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <ArrowLeft className="h-4 w-4" />
            ক্রয় তালিকায় ফিরে যান
          </Button>
        </Link>
      </div>

      {/* Invoice Card */}
      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  চালান নং: {purchase.invoiceNumber}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                তারিখ ও সময়: {dateFormatted}
              </p>
            </div>
            <div>
              {purchase.duePoisha > 0 ? (
                <Badge className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 text-sm px-3 py-1 font-semibold rounded-lg">
                  বাকি ক্রয় (দেনা: {formatMoneyBn(purchase.duePoisha)})
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-sm px-3 py-1 font-semibold rounded-lg">
                  পরিশোধিত ক্রয়
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Supplier Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase flex items-center gap-1.5 mb-1">
                <Building2 className="h-3.5 w-3.5" />
                সাপ্লায়ার / মহাজন
              </span>
              {purchase.supplier ? (
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                    {purchase.supplier.name}
                  </div>
                  {purchase.supplier.companyName && (
                    <div className="text-sm text-zinc-500">
                      {purchase.supplier.companyName}
                    </div>
                  )}
                  {purchase.supplier.phone && (
                    <div className="text-sm text-zinc-500">
                      ফোন: {purchase.supplier.phone}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-zinc-500 italic">সাধারণ নগদ ক্রয়</span>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-semibold text-zinc-400 uppercase flex sm:justify-end items-center gap-1.5 mb-1">
                <CreditCard className="h-3.5 w-3.5" />
                পরিশোধের মাধ্যম
              </span>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {purchase.paymentMethod}
              </div>
              {purchase.user && (
                <div className="text-xs text-zinc-500 mt-1 flex sm:justify-end items-center gap-1">
                  <User className="h-3 w-3" />
                  এন্ট্রি করেছেন: {purchase.user.name}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              ক্রয়কৃত পণ্যের বিবরণ
            </h3>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 text-xs font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5 text-left">পণ্য</th>
                    <th className="py-2.5 px-3.5 text-center">পরিমাণ</th>
                    <th className="py-2.5 px-3.5 text-right">ক্রয় দর</th>
                    <th className="py-2.5 px-3.5 text-right">মোট টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {purchase.items.map((item: PurchaseItemDetail) => (
                    <tr key={item.id}>
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.productName}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center font-semibold text-zinc-700 dark:text-zinc-300">
                        {toBanglaDigits(item.quantity)} {item.unit}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-zinc-600 dark:text-zinc-400">
                        {formatMoneyBn(item.buyPricePoisha)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {formatMoneyBn(item.subtotalPoisha)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>উপ-মোট (Subtotal):</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMoneyBn(purchase.subtotalPoisha)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-100 border-t border-zinc-200 dark:border-zinc-800 pt-2">
                <span>সর্বমোট ক্রয়:</span>
                <span>{formatMoneyBn(purchase.totalPoisha)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>নগদ পরিশোধ:</span>
                <span>{formatMoneyBn(purchase.paidPoisha)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold border-t border-zinc-100 dark:border-zinc-800 pt-1">
                <span>অবশিষ্ট বাকি দেনা:</span>
                <span>{formatMoneyBn(purchase.duePoisha)}</span>
              </div>
            </div>
          </div>

          {purchase.notes && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-200/50">
              <span className="font-semibold block mb-0.5">নোট:</span>
              {purchase.notes}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
