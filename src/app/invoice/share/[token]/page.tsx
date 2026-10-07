import { notFound } from "next/navigation";
import { verifyInvoiceShareToken } from "@/lib/invoice/token";
import { prisma } from "@/lib/db/prisma";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Download, ShieldAlert } from "lucide-react";

export default async function SharedInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verification = verifyInvoiceShareToken(token);

  if (!verification.valid || !verification.payload) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center shadow-lg">
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            চালানটি প্রদর্শিত হচ্ছে না
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            {verification.error || "এই চালানের লিংকের মেয়াদ শেষ হয়ে গেছে অথবা লিঙ্কটি সঠিক নয়।"}
          </p>
          <p className="text-xs text-zinc-500">
            নতুন চালানের কপির জন্য দোকান মালিকের সাথে সরাসরি যোগাযোগ করুন।
          </p>
        </div>
      </div>
    );
  }

  const { saleId, shopId, exp } = verification.payload;

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, shopId, deletedAt: null },
    include: {
      items: true,
      customer: true,
      shop: true,
      user: true,
    },
  });

  if (!sale) {
    notFound();
  }

  const formattedDate = new Date(sale.createdAt).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = new Date(sale.createdAt).toLocaleTimeString("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const expiresDate = new Date(exp * 1000).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isPaid = sale.duePoisha === 0;
  const isPartial = sale.paidPoisha > 0 && sale.duePoisha > 0;
  const statusLabel = isPaid ? "পরিশোধিত" : isPartial ? "আংশিক বাকি" : "সম্পূর্ণ বাকি";
  const statusBadge = isPaid
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isPartial
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";

  const pdfDownloadUrl = `/api/sales/${sale.id}/pdf?token=${token}`;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 py-8 px-4 font-sans print:p-0 print:bg-white">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Public Action Header (Hidden in Print) */}
        <div className="print:hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="text-xs text-zinc-500">সুরক্ষিত পাবলিক চালান লিংক</div>
            <div className="text-xs text-emerald-600 font-medium">
              মেয়াদ: {expiresDate} পর্যন্ত
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Download className="h-4 w-4" />
              পিডিএফ ডাউনলোড
            </a>
          </div>
        </div>

        {/* Invoice Paper Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Shop Header */}
          <div className="border-b-2 border-emerald-600 pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">
                {sale.shop.name}
              </h1>
              <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
                {sale.shop.address && <p>ঠিকানা: {sale.shop.address}</p>}
                {sale.shop.phone && <p>মোবাইল: {sale.shop.phone}</p>}
              </div>
            </div>
            <div className="sm:text-right">
              <span
                className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${statusBadge}`}
              >
                {statusLabel}
              </span>
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                চালান নং: {sale.invoiceNumber}
              </div>
              <div className="text-xs text-zinc-500">
                {formattedDate} • {formattedTime}
              </div>
            </div>
          </div>

          {/* Customer & Billing Info */}
          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700/60 mb-6 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                গ্রাহকের নাম:
              </div>
              <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {sale.customer ? sale.customer.name : "সাধারণ নগদ ক্রেতা"}
              </div>
              {sale.customer?.phone && (
                <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  মোবাইল: {sale.customer.phone}
                </div>
              )}
            </div>
            <div className="sm:text-right">
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                বিক্রয় প্রতিনিধি:
              </div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {sale.user?.name || "দোকান প্রতিনিধি"}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="py-2.5 px-3 text-center w-10">ক্র.</th>
                  <th className="py-2.5 px-3 font-semibold">পণ্যের বিবরণ</th>
                  <th className="py-2.5 px-3 text-center">পরিমাণ</th>
                  <th className="py-2.5 px-3 text-right">দর (৳)</th>
                  <th className="py-2.5 px-3 text-right">মোট (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sale.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 text-center text-zinc-400">
                      {toBanglaDigits(index + 1)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-3 text-center text-zinc-700 dark:text-zinc-300">
                      {toBanglaDigits(item.quantity)} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatMoneyBn(item.unitPricePoisha)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatMoneyBn(item.subtotalPoisha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="flex justify-end mb-6">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-zinc-600 dark:text-zinc-400">
                <span>উপ-মোট:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMoneyBn(sale.subtotalPoisha)}
                </span>
              </div>
              {sale.discountPoisha > 0 && (
                <div className="flex justify-between py-1 text-emerald-600">
                  <span>ছাড়:</span>
                  <span className="font-semibold">
                    - {formatMoneyBn(sale.discountPoisha)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-b-2 border-emerald-600 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                <span>সর্বমোট:</span>
                <span>{formatMoneyBn(sale.totalPoisha)}</span>
              </div>
              <div className="flex justify-between py-1 text-zinc-700 dark:text-zinc-300 font-medium">
                <span>নগদ জমা:</span>
                <span className="font-bold text-emerald-600">
                  {formatMoneyBn(sale.paidPoisha)}
                </span>
              </div>
              {sale.duePoisha > 0 && (
                <div className="flex justify-between py-1 text-red-600 font-bold">
                  <span>বকেয়া (বাকি):</span>
                  <span>{formatMoneyBn(sale.duePoisha)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-4 text-center text-xs text-zinc-500">
            <p>আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ।</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              চালান প্রস্তুতকারক: বাকি (Baki) • সহজ হিসাব, দ্রুত বাকি খাতা
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
