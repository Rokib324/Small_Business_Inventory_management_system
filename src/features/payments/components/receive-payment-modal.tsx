"use client";

import { useState } from "react";
import { Customer, PaymentMethod } from "@prisma/client";
import { formatMoneyBn, fromPoisha } from "@/lib/money";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { receivePaymentAction } from "../actions";
import { HandCoins } from "lucide-react";
import { t } from "@/lib/i18n";

interface ReceivePaymentModalProps {
  open: boolean;
  onClose: () => void;
  customers?: Customer[];
  selectedCustomer?: Customer | null;
}

export function ReceivePaymentModal({
  open,
  onClose,
  customers = [],
  selectedCustomer: preSelectedCustomer,
}: ReceivePaymentModalProps) {
  const [customerId, setCustomerId] = useState(
    preSelectedCustomer ? preSelectedCustomer.id : ""
  );

  const activeCustomer =
    preSelectedCustomer || customers.find((c) => c.id === customerId);

  const [amountTaka, setAmountTaka] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFullDue = () => {
    if (activeCustomer && activeCustomer.cachedBalancePoisha > 0) {
      setAmountTaka(String(fromPoisha(activeCustomer.cachedBalancePoisha)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const amount = parseFloat(amountTaka) || 0;
    if (amount <= 0) {
      setGeneralError("টাকার পরিমাণ ০ এর বেশি হতে হবে");
      return;
    }

    if (!customerId && !preSelectedCustomer) {
      setGeneralError("অনুগ্রহ করে কাস্টমার নির্বাচন করুন");
      return;
    }

    setLoading(true);

    try {
      const res = await receivePaymentAction({
        customerId: preSelectedCustomer ? preSelectedCustomer.id : customerId,
        amountTaka: amount,
        method,
        reference,
        note,
      });

      if (!res.success) {
        setGeneralError(res.message || "পেমেন্ট গ্রহণ করতে সমস্যা হয়েছে");
        if (res.errors) setErrors(res.errors);
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
      }
    } catch {
      setGeneralError("একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।");
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="বাকি টাকা জমা নিন"
      description="কাস্টমারের বকেয়া বাকি থেকে প্রাপ্ত অর্থ জমা করে খাতা আপডেট করুন"
    >
      {generalError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Selector if not fixed */}
        {!preSelectedCustomer && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.customers.customerName} *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              required
            >
              <option value="">কাস্টমার নির্বাচন করুন...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""} — বাকি:{" "}
                  {formatMoneyBn(c.cachedBalancePoisha)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Customer Due Badge */}
        {activeCustomer && (
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 flex justify-between items-center text-xs">
            <div>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                {activeCustomer.name}
              </p>
              {activeCustomer.phone && (
                <p className="text-zinc-400 mt-0.5">{activeCustomer.phone}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-zinc-500 block text-[11px]">বর্তমান বাকি:</span>
              <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                {formatMoneyBn(activeCustomer.cachedBalancePoisha)}
              </span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.payments.amount} (৳) *
            </label>
            {activeCustomer && activeCustomer.cachedBalancePoisha > 0 && (
              <button
                type="button"
                onClick={handleFullDue}
                className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
              >
                পুরো বাকি পরিশোধ
              </button>
            )}
          </div>
          <Input
            type="number"
            step="any"
            min="1"
            placeholder="যেমন: ১০০০"
            value={amountTaka}
            onChange={(e) => setAmountTaka(e.target.value)}
            error={errors.amountTaka?.[0]}
            className="text-base font-bold"
            required
          />
        </div>

        {/* Method */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            পরিশোধের মাধ্যম *
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value={PaymentMethod.CASH}>নগদ (Cash)</option>
            <option value={PaymentMethod.BKASH}>বিকাশ (bKash)</option>
            <option value={PaymentMethod.NAGAD}>নগদ ডিজিটাল (Nagad)</option>
            <option value={PaymentMethod.BANK}>ব্যাংক ট্রান্সফার (Bank)</option>
          </select>
        </div>

        {/* Reference / TrxID */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            রেফারেন্স / ট্রানজেকশন আইডি (ঐচ্ছিক)
          </label>
          <Input
            placeholder="যেমন: TrxID বা রসিদ নং..."
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        {/* Note */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">নোট (ঐচ্ছিক)</label>
          <Input
            placeholder="পেমেন্ট সম্পর্কিত কোনো তথ্য..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" isLoading={loading} className="gap-2">
            <HandCoins className="h-4 w-4" />
            জমা নিশ্চিত করুন
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
