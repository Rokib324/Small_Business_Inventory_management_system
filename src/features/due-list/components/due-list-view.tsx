"use client";

import { useState } from "react";
import { Customer } from "@prisma/client";
import { formatMoneyBn, toBanglaDigits, toPoisha } from "@/lib/money";
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
  MessageSquare,
  Users,
  Send,
  Loader2,
} from "lucide-react";
import { t } from "@/lib/i18n";
import {
  sendDueReminderAction,
  sendBulkDueReminderAction,
} from "@/features/sms/actions";

interface DueListViewProps {
  customers: Customer[];
}

export function DueListView({ customers }: DueListViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] =
    useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // SMS states
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [minDueAmountTaka, setMinDueAmountTaka] = useState<number>(100);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [sendingSingleId, setSendingSingleId] = useState<string | null>(null);
  const [smsFeedback, setSmsFeedback] = useState<string | null>(null);

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

  const handleSendSingleSms = async (customer: Customer) => {
    if (!customer.phone) {
      alert("এই খদ্দেরের কোনো মোবাইল নম্বর নেই।");
      return;
    }

    setSendingSingleId(customer.id);
    setSmsFeedback(null);
    try {
      const res = await sendDueReminderAction({ customerId: customer.id });
      if (res.success) {
        setSmsFeedback(`${customer.name}-কে বকেয়া তাগাদা এসএমএস সফলভাবে পাঠানো হয়েছে!`);
      } else {
        setSmsFeedback(`ব্যর্থ: ${res.error || "এসএমএস পাঠানো যায়নি"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "এসএমএস পাঠানো যায়নি";
      setSmsFeedback(`ব্যর্থ: ${msg}`);
    } finally {
      setSendingSingleId(null);
    }
  };

  const minDuePoisha = toPoisha(minDueAmountTaka || 0);
  const bulkEligibleCount = customers.filter(
    (c) => c.cachedBalancePoisha >= minDuePoisha && c.phone && c.phone.trim().length >= 10
  ).length;

  const handleSendBulkSms = async () => {
    if (bulkEligibleCount === 0) {
      alert("নির্বাচিত শর্তে কোনো যোগ্য খদ্দের পাওয়া যায়নি।");
      return;
    }

    setIsSendingBulk(true);
    try {
      const res = await sendBulkDueReminderAction({
        minDueAmountPoisha: minDuePoisha,
      });
      setIsBulkModalOpen(false);
      setSmsFeedback(
        `একসাথে তাগাদা সম্পন্ন: মোট ${toBanglaDigits(res.sentCount)} জনকে এসএমএস পাঠানো হয়েছে। ${
          res.failedCount > 0 ? `(${toBanglaDigits(res.failedCount)} টি ব্যর্থ)` : ""
        }`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "বাল্ক এসএমএস পাঠানো যায়নি";
      alert(msg);
    } finally {
      setIsSendingBulk(false);
    }
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

        <div className="flex flex-col sm:items-end gap-3">
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

          <Button
            onClick={() => setIsBulkModalOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 cursor-pointer bg-white dark:bg-zinc-900 border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-50"
          >
            <Users className="h-4 w-4 text-amber-600" />
            একসাথে বাকি তাগাদা পাঠান (SMS)
          </Button>
        </div>
      </div>

      {/* SMS feedback toast */}
      {smsFeedback && (
        <div className="p-3.5 rounded-xl text-xs font-medium bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <span>{smsFeedback}</span>
          <button
            onClick={() => setSmsFeedback(null)}
            className="text-zinc-400 hover:text-zinc-700 text-base font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

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
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs font-semibold text-zinc-500">
                    <th className="px-4 py-3">খদ্দেরের নাম</th>
                    <th className="px-4 py-3">ফোন নম্বর</th>
                    <th className="px-4 py-3 text-right">বাকি পরিমাণ</th>
                    <th className="px-4 py-3 text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredCustomers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/customers/${c.id}`}
                          className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline"
                        >
                          {c.name}
                        </Link>
                        {c.address && (
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
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
                          {c.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendSingleSms(c)}
                              disabled={sendingSingleId === c.id}
                              className="gap-1 h-8 text-xs font-medium cursor-pointer text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50"
                              title="এসএমএস তাগাদা পাঠান"
                            >
                              {sendingSingleId === c.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                              )}
                              তাগাদা SMS
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayment(c)}
                            className="gap-1.5 h-8 text-xs font-semibold cursor-pointer"
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

      {/* Bulk Due Reminder SMS Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                একসাথে সকল বকেয়া খদ্দেরকে এসএমএস
              </h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-xl"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              একটি নির্দিষ্ট পরিমাণের বেশি বাকি থাকা সকল খদ্দেরের কাছে এক ক্লিকে বাংলা তাগাদা এসএমএস পাঠান।
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  নূন্যতম বাকি পরিমাণ (টাকা):
                </label>
                <Input
                  type="number"
                  min="1"
                  value={minDueAmountTaka}
                  onChange={(e) => setMinDueAmountTaka(Number(e.target.value) || 0)}
                  placeholder="যেমন: ৫০০"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1">
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  নির্বাচিত মানদণ্ডে এসএমএস পাবেন:{" "}
                  <span className="font-black text-sm text-rose-600">
                    {toBanglaDigits(bulkEligibleCount)}
                  </span>{" "}
                  জন খদ্দের
                </div>
                <p className="text-zinc-500 text-[11px]">
                  (শুধুমাত্র যাদের মোবাইল নম্বর সংরক্ষিত আছে তারা এসএমএস পাবেন)
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={isSendingBulk}
                >
                  বাতিল
                </Button>
                <Button
                  onClick={handleSendBulkSms}
                  disabled={isSendingBulk || bulkEligibleCount === 0}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {isSendingBulk ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      পাঠানো হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      এসএমএস পাঠান
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
