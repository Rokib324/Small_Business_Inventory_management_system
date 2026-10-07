"use client";

import { useState } from "react";
import { Payment, Customer } from "@prisma/client";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { ReceivePaymentModal } from "./receive-payment-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { HandCoins, Plus, ArrowRight } from "lucide-react";
import { t } from "@/lib/i18n";

type PaymentWithCustomer = Payment & {
  customer: Customer | null;
};

interface PaymentsListViewProps {
  payments: PaymentWithCustomer[];
  customers: Customer[];
}

export function PaymentsListView({
  payments,
  customers,
}: PaymentsListViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalCollectedPoisha = payments.reduce(
    (sum, p) => sum + p.amountPoisha,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <HandCoins className="h-6 w-6 text-emerald-600" />
            {t.payments.title}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            মোট আদায়: {toBanglaDigits(payments.length)} টি লেনদেন | সর্বমোট সংগৃহীত:{" "}
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {formatMoneyBn(totalCollectedPoisha)}
            </span>
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t.payments.collectPayment}
        </Button>
      </div>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              এখনও কোন পেমেন্ট আদায় রেকর্ড নেই। প্রথম পেমেন্ট গ্রহণ করতে{" "}
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-emerald-600 font-semibold underline cursor-pointer"
              >
                এখানে ক্লিক করুন
              </button>
              ।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">কাস্টমারের নাম</th>
                    <th className="px-4 py-3.5 font-semibold">তারিখ</th>
                    <th className="px-4 py-3.5 font-semibold">মাধ্যম</th>
                    <th className="px-4 py-3.5 font-semibold">রেফারেন্স / বিবরণ</th>
                    <th className="px-4 py-3.5 font-semibold text-right">আদায়ের পরিমাণ</th>
                    <th className="px-4 py-3.5 font-semibold text-right">খাতা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {payments.map((p) => {
                    const formattedDate = new Date(p.createdAt).toLocaleDateString(
                      "bn-BD",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    );

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {p.customer ? p.customer.name : "সরাসরি জমা"}
                          </span>
                          {p.customer?.phone && (
                            <span className="block text-[11px] text-zinc-400">
                              {p.customer.phone}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500">
                          {formattedDate}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="secondary">
                            {p.method === "CASH"
                              ? "নগদ"
                              : p.method === "BKASH"
                              ? "বিকাশ"
                              : p.method === "NAGAD"
                              ? "নগদ ডিজিটাল"
                              : p.method}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                          {p.reference && (
                            <span className="font-mono">{p.reference}</span>
                          )}
                          {p.note && <span className="block text-zinc-400">{p.note}</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-emerald-700 dark:text-emerald-400 text-base">
                          {formatMoneyBn(p.amountPoisha)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {p.customer && (
                            <Link
                              href={`/customers/${p.customer.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                            >
                              খাতা <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
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
      {isModalOpen && (
        <ReceivePaymentModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customers={customers}
        />
      )}
    </div>
  );
}
