"use client";

import { useState } from "react";
import { Sale, SaleItem, Customer, Shop, User } from "@prisma/client";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  ShoppingCart,
  FileText,
  Receipt as ReceiptIcon,
  Download,
  Share2,
  MessageSquare,
  Copy,
  Check,
  Send,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { getSaleShareDataAction } from "../actions";
import { sendSaleReceiptAction } from "@/features/sms/actions";

type FullSale = Sale & {
  items: SaleItem[];
  customer: Customer | null;
  shop: Shop;
  user: User | null;
};

interface InvoiceViewProps {
  sale: FullSale;
}

export function InvoiceView({ sale }: InvoiceViewProps) {
  const [layoutMode, setLayoutMode] = useState<"a4" | "thermal">("a4");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    shareUrl: string;
    whatsAppUrl: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(`/api/sales/${sale.id}/pdf?format=${layoutMode}`, "_blank");
  };

  const handleOpenShare = async () => {
    setIsShareModalOpen(true);
    if (!shareData) {
      const res = await getSaleShareDataAction(sale.id);
      if (res.success && res.data) {
        setShareData({
          shareUrl: res.data.shareUrl,
          whatsAppUrl: res.data.whatsAppUrl,
        });
      }
    }
  };

  const handleCopyLink = () => {
    if (shareData?.shareUrl) {
      navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendSms = async () => {
    if (!sale.customer?.phone) {
      alert("গ্রাহকের কোনো মোবাইল নম্বর নেই।");
      return;
    }

    setIsSendingSms(true);
    setSmsFeedback(null);
    try {
      const res = await sendSaleReceiptAction({ saleId: sale.id });
      if (res.success) {
        setSmsFeedback("রসিদ এসএমএস সফলভাবে পাঠানো হয়েছে!");
      } else {
        setSmsFeedback(`ব্যর্থ: ${res.error || "এসএমএস পাঠানো যায়নি"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "এসএমএস পাঠানো যায়নি";
      setSmsFeedback(`ব্যর্থ: ${msg}`);
    } finally {
      setIsSendingSms(false);
    }
  };

  const formattedDate = new Date(sale.createdAt).toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = new Date(sale.createdAt).toLocaleTimeString("bn-BD", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="print:hidden flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>চালান: {sale.invoiceNumber}</span>
            </h1>
            <p className="text-xs text-zinc-500">
              {formattedDate} • {formattedTime}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layout Mode Toggle */}
          <div className="flex p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">
            <button
              onClick={() => setLayoutMode("a4")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                layoutMode === "a4"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              এ৪ চালান (A4)
            </button>
            <button
              onClick={() => setLayoutMode("thermal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                layoutMode === "thermal"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <ReceiptIcon className="h-3.5 w-3.5" />
              ৮০মিমি রসিদ (POS)
            </button>
          </div>

          <Button onClick={handlePrint} variant="outline" className="gap-2 cursor-pointer">
            <Printer className="h-4 w-4" />
            {t.common.print}
          </Button>

          <Button onClick={handleDownloadPdf} variant="outline" className="gap-2 cursor-pointer text-emerald-700 dark:text-emerald-400">
            <Download className="h-4 w-4" />
            PDF ডাউনলোড
          </Button>

          <Button onClick={handleOpenShare} variant="outline" className="gap-2 cursor-pointer">
            <Share2 className="h-4 w-4" />
            শেয়ার / হোয়াটসঅ্যাপ
          </Button>

          {sale.customer?.phone && (
            <Button
              onClick={handleSendSms}
              disabled={isSendingSms}
              variant="outline"
              className="gap-2 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              {isSendingSms ? "পাঠানো হচ্ছে..." : "এসএমএস রসিদ"}
            </Button>
          )}

          <Link href="/sales/new">
            <Button className="gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white">
              <ShoppingCart className="h-4 w-4" />
              নতুন বিক্রি
            </Button>
          </Link>
        </div>
      </div>

      {/* SMS feedback toast banner */}
      {smsFeedback && (
        <div className="print:hidden p-3 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>{smsFeedback}</span>
          <button
            onClick={() => setSmsFeedback(null)}
            className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Share / WhatsApp Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-emerald-600" />
                চালান শেয়ার করুন
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-xl"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              নিরাপদ এনক্রিপ্টেড ও মেয়াদযুক্ত লিংকের মাধ্যমে গ্রাহককে চালান শেয়ার করুন:
            </p>

            {shareData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <input
                    type="text"
                    readOnly
                    value={shareData.shareUrl}
                    className="text-xs bg-transparent w-full text-zinc-700 dark:text-zinc-300 outline-hidden font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition"
                    title="লিংক কপি করুন"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {shareData.whatsAppUrl ? (
                  <a
                    href={shareData.whatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Send className="h-4 w-4" />
                    হোয়াটসঅ্যাপে পাঠান ({sale.customer?.phone})
                  </a>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                    গ্রাহকের মোবাইল নম্বর নেই। কপি বাটন চেপে মেসেঞ্জারে বা এসএমএসে লিংক পাঠাতে পারেন।
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-zinc-500">
                সুরক্ষিত লিংক তৈরি হচ্ছে...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. A4 INVOICE LAYOUT */}
      {/* ========================================================================= */}
      {layoutMode === "a4" && (
        <div className="bg-white text-zinc-900 max-w-4xl mx-auto p-8 sm:p-12 rounded-2xl shadow-md border border-zinc-200 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full">
          {/* Shop Header */}
          <div className="text-center border-b-2 border-zinc-900 pb-5">
            <h2 className="text-3xl font-black tracking-tight text-emerald-800 print:text-black">
              {sale.shop.name}
            </h2>
            {sale.shop.address && (
              <p className="text-sm text-zinc-600 mt-1">{sale.shop.address}</p>
            )}
            {sale.shop.phone && (
              <p className="text-sm font-semibold text-zinc-700 mt-0.5">
                মোবাইল: {toBanglaDigits(sale.shop.phone)}
              </p>
            )}
            <div className="inline-block mt-3 px-4 py-1 bg-zinc-900 text-white text-xs font-bold rounded uppercase tracking-wider print:border print:border-black">
              বিক্রয় চালান / ইনভয়েস
            </div>
          </div>

          {/* Invoice Meta and Customer Information */}
          <div className="grid grid-cols-2 gap-6 my-6 text-sm">
            {/* Customer Details */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                ক্রেতার বিবরণ:
              </p>
              <p className="font-bold text-base text-zinc-900">
                {sale.customer ? sale.customer.name : t.sales.walkInCustomer}
              </p>
              {sale.customer?.phone && (
                <p className="text-zinc-600">
                  মোবাইল: {toBanglaDigits(sale.customer.phone)}
                </p>
              )}
              {sale.customer?.address && (
                <p className="text-zinc-600">ঠিকানা: {sale.customer.address}</p>
              )}
            </div>

            {/* Invoice Details */}
            <div className="space-y-1 text-right">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                চালানের তথ্য:
              </p>
              <p className="font-bold text-zinc-900">
                চালান নং: <span className="font-mono">{sale.invoiceNumber}</span>
              </p>
              <p className="text-zinc-600">তারিখ: {formattedDate}</p>
              <p className="text-zinc-600">সময়: {formattedTime}</p>
              <p className="text-zinc-600">
                বিক্রেতা: {sale.user ? sale.user.name : "কাউন্টার"}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-sm border-collapse my-6">
            <thead>
              <tr className="border-y-2 border-zinc-900 text-xs uppercase bg-zinc-50 print:bg-transparent">
                <th className="py-2.5 px-3 w-12 text-center">ক্র.</th>
                <th className="py-2.5 px-3">পণ্যের বিবরণ</th>
                <th className="py-2.5 px-3 text-center w-24">পরিমাণ</th>
                <th className="py-2.5 px-3 text-right w-28">দর (৳)</th>
                <th className="py-2.5 px-3 text-right w-32">মোট টাকা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {sale.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="py-3 px-3 text-center text-zinc-500 font-mono">
                    {toBanglaDigits(index + 1)}
                  </td>
                  <td className="py-3 px-3 font-semibold text-zinc-900">
                    {item.productName}
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    {toBanglaDigits(item.quantity)} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-medium">
                    {formatMoneyBn(item.unitPricePoisha, { showCurrencySymbol: false })}
                  </td>
                  <td className="py-3 px-3 text-right font-bold">
                    {formatMoneyBn(item.subtotalPoisha)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals & Financial Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>{t.common.subtotal}:</span>
                <span className="font-semibold">
                  {formatMoneyBn(sale.subtotalPoisha)}
                </span>
              </div>

              {sale.discountPoisha > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>{t.common.discount}:</span>
                  <span className="font-semibold text-rose-600">
                    -{formatMoneyBn(sale.discountPoisha)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-black border-t-2 border-zinc-900 pt-2">
                <span>{t.common.total}:</span>
                <span className="text-emerald-800 print:text-black">
                  {formatMoneyBn(sale.totalPoisha)}
                </span>
              </div>

              <div className="flex justify-between text-zinc-700">
                <span>নগদ জমা (Paid):</span>
                <span className="font-bold">
                  {formatMoneyBn(sale.paidPoisha)}
                </span>
              </div>

              <div className="flex justify-between font-bold border-t border-zinc-200 pt-1 text-rose-700 print:text-black">
                <span>এই চালানে বাকি (Due):</span>
                <span>{formatMoneyBn(sale.duePoisha)}</span>
              </div>

              {sale.customer && (
                <div className="p-2.5 rounded bg-zinc-100 print:border print:border-zinc-400 text-xs space-y-1 mt-2">
                  <div className="flex justify-between text-zinc-600">
                    <span>কাস্টমারের বর্তমান মোট বাকি:</span>
                    <span className="font-black text-sm text-zinc-900">
                      {formatMoneyBn(sale.customer.cachedBalancePoisha)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mt-20 pt-6 text-xs text-center border-t border-dashed border-zinc-300">
            <div>
              <div className="w-40 border-t border-zinc-900 mx-auto mb-1"></div>
              <p className="font-semibold">ক্রেতার স্বাক্ষর</p>
            </div>
            <div>
              <div className="w-40 border-t border-zinc-900 mx-auto mb-1"></div>
              <p className="font-semibold">অনুমোদিত স্বাক্ষর</p>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-zinc-400 mt-8">
            আমাদের সাথে ব্যবসা করার জন্য ধন্যবাদ। আবার আসবেন।
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 80MM POS THERMAL RECEIPT LAYOUT */}
      {/* ========================================================================= */}
      {layoutMode === "thermal" && (
        <div className="bg-white text-black w-[320px] mx-auto p-4 rounded-xl shadow-md border border-zinc-200 font-mono text-xs print:border-none print:shadow-none print:p-0 print:w-full">
          {/* Header */}
          <div className="text-center border-b border-dashed border-black pb-3">
            <h2 className="text-lg font-black leading-tight">
              {sale.shop.name}
            </h2>
            {sale.shop.address && (
              <p className="text-[11px] mt-0.5">{sale.shop.address}</p>
            )}
            {sale.shop.phone && (
              <p className="text-[11px]">মোবাইল: {toBanglaDigits(sale.shop.phone)}</p>
            )}
            <p className="font-bold mt-1 text-[11px] uppercase">
              *** ক্যাশ মেমো ***
            </p>
          </div>

          {/* Receipt Info */}
          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[11px]">
            <p>রসিদ: {sale.invoiceNumber}</p>
            <p>
              তারিখ: {formattedDate} {formattedTime}
            </p>
            <p>
              ক্রেতা: {sale.customer ? sale.customer.name : "নগদ ক্রেতা"}
            </p>
            {sale.customer?.phone && <p>ফোন: {toBanglaDigits(sale.customer.phone)}</p>}
          </div>

          {/* Items */}
          <div className="py-2 border-b border-dashed border-black space-y-1.5">
            {sale.items.map((item) => (
              <div key={item.id} className="space-y-0.5">
                <p className="font-bold">{item.productName}</p>
                <div className="flex justify-between text-[11px]">
                  <span>
                    {toBanglaDigits(item.quantity)} x{" "}
                    {formatMoneyBn(item.unitPricePoisha, { showCurrencySymbol: false })}
                  </span>
                  <span className="font-bold">
                    {formatMoneyBn(item.subtotalPoisha)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>উপ-মোট:</span>
              <span>{formatMoneyBn(sale.subtotalPoisha)}</span>
            </div>
            {sale.discountPoisha > 0 && (
              <div className="flex justify-between">
                <span>ছাড়:</span>
                <span>-{formatMoneyBn(sale.discountPoisha)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
              <span>সর্বমোট:</span>
              <span>{formatMoneyBn(sale.totalPoisha)}</span>
            </div>
            <div className="flex justify-between">
              <span>নগদ জমা:</span>
              <span>{formatMoneyBn(sale.paidPoisha)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs text-rose-700 print:text-black">
              <span>বাকি:</span>
              <span>{formatMoneyBn(sale.duePoisha)}</span>
            </div>
          </div>

          {/* Customer Total Due */}
          {sale.customer && (
            <div className="py-2 border-b border-dashed border-black text-[11px] flex justify-between font-bold">
              <span>মোট বাকি জের:</span>
              <span>{formatMoneyBn(sale.customer.cachedBalancePoisha)}</span>
            </div>
          )}

          {/* Thermal Footer */}
          <div className="text-center pt-3 text-[10px] space-y-0.5">
            <p>ধন্যবাদ, আবার আসবেন!</p>
            <p>Baki App দ্বারা প্রস্তুতকৃত</p>
          </div>
        </div>
      )}
    </div>
  );
}
