"use client";

import { useState } from "react";
import { Customer, LedgerEntry } from "@prisma/client";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { calculateRunningBalances } from "../utils";
import { ReceivePaymentModal } from "@/features/payments/components/receive-payment-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowLeft,
  HandCoins,
  Printer,
  BookOpen,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { t } from "@/lib/i18n";

interface CustomerLedgerViewProps {
  customer: Customer;
  entries: LedgerEntry[];
}

export function CustomerLedgerView({
  customer,
  entries,
}: CustomerLedgerViewProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Compute running balance for each row
  const entriesWithBalance = calculateRunningBalances(entries, 0);

  const totalDebit = entries.reduce((sum, e) => sum + e.debitPoisha, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.creditPoisha, 0);

  const hasDue = customer.cachedBalancePoisha > 0;
  const hasAdvance = customer.cachedBalancePoisha < 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <span>{customer.name} - খাতা ও লেনদেন বিবরণী</span>
            </h1>
            <p className="text-xs text-zinc-500">
              {customer.phone ? `মোবাইল: ${customer.phone}` : "কোন মোবাইল নম্বর নেই"}
              {customer.address ? ` • ${customer.address}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            {t.common.print}
          </Button>

          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            className="gap-2"
          >
            <HandCoins className="h-4 w-4" />
            টাকা জমা নিন
          </Button>
        </div>
      </div>

      {/* Customer Profile & Balance KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current Balance */}
        <Card className={hasDue ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20" : ""}>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-zinc-500">
              বর্তমান বকেয়া বাকি (Current Due)
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div
              className={`text-2xl font-black ${
                hasDue
                  ? "text-rose-600 dark:text-rose-400"
                  : hasAdvance
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatMoneyBn(customer.cachedBalancePoisha)}
            </div>
            <div className="mt-1">
              {hasDue ? (
                <Badge variant="warning" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  বাকি পরিশোধ বাকি আছে
                </Badge>
              ) : hasAdvance ? (
                <Badge variant="secondary">অগ্রিম জমা</Badge>
              ) : (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  সম্পূর্ণ পরিশোধিত
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Debit (Due Created) */}
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-zinc-500">
              সর্বমোট বাকি নিয়েছে (Total Debit)
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatMoneyBn(totalDebit)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              শুরুর দিন থেকে মোট বাকি বিক্রয়
            </p>
          </CardContent>
        </Card>

        {/* Total Credit (Payments Received) */}
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold text-zinc-500">
              সর্বমোট জমা দিয়েছে (Total Credit)
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatMoneyBn(totalCredit)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              পরিশোধিত মোট অর্থ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card className="overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <span>লেনদেন খাতা বিবরণী (Statement)</span>
          </CardTitle>
          <span className="text-xs text-zinc-400">
            মোট এন্ট্রি: {toBanglaDigits(entries.length)} টি
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {entriesWithBalance.length === 0 ? (
            <div className="p-10 text-center text-zinc-400 text-sm">
              এই কাস্টমারের কোন লেনদেন রেকর্ড নেই।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">তারিখ ও সময়</th>
                    <th className="px-4 py-3 font-semibold">বিবরণ / সূত্র</th>
                    <th className="px-4 py-3 font-semibold text-right text-rose-600">
                      বাকি যোগ (+ ডেবিট)
                    </th>
                    <th className="px-4 py-3 font-semibold text-right text-emerald-600">
                      জমা পরিশোধ (- ক্রেডিট)
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      জের (ব্যালেন্স)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {entriesWithBalance.map((entry) => {
                    const dateStr = new Date(entry.createdAt).toLocaleDateString(
                      "bn-BD",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    );
                    const timeStr = new Date(entry.createdAt).toLocaleTimeString(
                      "bn-BD",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    );

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                      >
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          <div>{dateStr}</div>
                          <div className="text-[10px] text-zinc-400">{timeStr}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {entry.description || "লেনদেন"}
                          </span>
                          {entry.saleId && (
                            <Link
                              href={`/sales/${entry.saleId}`}
                              className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                            >
                              <Receipt className="h-3 w-3" />
                              চালান দেখুন
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                          {entry.debitPoisha > 0 ? (
                            `+${formatMoneyBn(entry.debitPoisha)}`
                          ) : (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {entry.creditPoisha > 0 ? (
                            `-${formatMoneyBn(entry.creditPoisha)}`
                          ) : (
                            <span className="text-zinc-300 font-normal">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-zinc-900 dark:text-zinc-100">
                          {formatMoneyBn(entry.runningBalancePoisha)}
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

      {/* Receive Payment Modal */}
      {isPaymentModalOpen && (
        <ReceivePaymentModal
          open={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          selectedCustomer={customer}
        />
      )}
    </div>
  );
}
