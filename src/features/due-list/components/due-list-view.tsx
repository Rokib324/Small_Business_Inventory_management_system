"use client";

import { useState } from "react";
import { Customer } from "@prisma/client";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { ReceivePaymentModal } from "@/features/payments/components/receive-payment-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  BookOpen,
  Search,
  HandCoins,
  Phone,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { t } from "@/lib/i18n";

interface DueListViewProps {
  customers: Customer[];
}

export function DueListView({ customers }: DueListViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] =
    useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  const totalDuePoisha = customers.reduce(
    (sum, c) => sum + (c.cachedBalancePoisha > 0 ? c.cachedBalancePoisha : 0),
    0
  );

  const handleOpenPayment = (customer: Customer) => {
    setSelectedCustomerForPayment(customer);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/10 border border-amber-300 dark:border-amber-900/50 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-amber-600" />
            <h1 className="text-xl md:text-2xl font-black text-amber-950 dark:text-amber-200">
              {t.nav.dueList}
            </h1>
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-400">
            বকেয়া বাকি তালিকা — সর্বাধিক বাকি থেকে ক্রমানুসারে সাজানো
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 block">
            সর্বমোট পাওনা বকেয়া:
          </span>
          <span className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400">
            {formatMoneyBn(totalDuePoisha)}
          </span>
          <span className="text-xs text-amber-700 dark:text-amber-400 block mt-0.5">
            ({toBanglaDigits(customers.length)} জন কাস্টমারের বাকি রয়েছে)
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="কাস্টমারের নাম বা ফোন নম্বর খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Due Customers Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              কোন বকেয়া বাকি কাস্টমার পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">নং</th>
                    <th className="px-4 py-3.5 font-semibold">কাস্টমারের নাম ও ঠিকানা</th>
                    <th className="px-4 py-3.5 font-semibold">মোবাইল নম্বর</th>
                    <th className="px-4 py-3.5 font-semibold text-right">বকেয়া বাকি (Due)</th>
                    <th className="px-4 py-3.5 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredCustomers.map((c, index) => (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-4 py-3.5 text-center text-zinc-400 font-mono text-xs">
                        {toBanglaDigits(index + 1)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/customers/${c.id}`}
                          className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 hover:underline"
                        >
                          {c.name}
                        </Link>
                        {c.address && (
                          <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {c.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.phone ? (
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-zinc-400" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-base text-rose-600 dark:text-rose-400">
                        {formatMoneyBn(c.cachedBalancePoisha)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayment(c)}
                            className="gap-1.5 h-8 text-xs font-semibold"
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                            টাকা জমা
                          </Button>
                          <Link
                            href={`/customers/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                          >
                            খাতা <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
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
          selectedCustomer={selectedCustomerForPayment}
        />
      )}
    </div>
  );
}
