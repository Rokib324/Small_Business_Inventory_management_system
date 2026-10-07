"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCustomerAction, updateCustomerAction } from "../actions";
import { t } from "@/lib/i18n";
import { Customer } from "@prisma/client";

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export function CustomerFormModal({
  open,
  onClose,
  customerToEdit,
}: CustomerFormModalProps) {
  const isEditing = !!customerToEdit;

  const [formData, setFormData] = useState({
    name: customerToEdit?.name || "",
    phone: customerToEdit?.phone || "",
    address: customerToEdit?.address || "",
    openingDueTaka: "0",
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setLoading(true);

    if (isEditing && customerToEdit) {
      const res = await updateCustomerAction({
        id: customerToEdit.id,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      });

      if (!res.success) {
        setGeneralError(res.message || "কাস্টমার আপডেট করতে সমস্যা হয়েছে");
        if (res.errors) setErrors(res.errors);
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
      }
    } else {
      const openingDue = parseFloat(formData.openingDueTaka) || 0;
      const res = await createCustomerAction({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        openingDueTaka: openingDue,
      });

      if (!res.success) {
        setGeneralError(res.message || "কাস্টমার তৈরি করতে সমস্যা হয়েছে");
        if (res.errors) setErrors(res.errors);
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "কাস্টমার তথ্য সম্পাদনা" : "নতুন কাস্টমার যোগ করুন"}
      description={
        isEditing
          ? "কাস্টমারের নাম, ফোন ও ঠিকানা পরিবর্তন করুন"
          : "খাতায় নতুন খদ্দেরের নাম ও আগের বকেয়া (যদি থাকে) অন্তর্ভুক্ত করুন"
      }
    >
      {generalError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {t.customers.customerName} *
          </label>
          <Input
            name="name"
            placeholder="যেমন: মো: করিম মিয়া"
            value={formData.name}
            onChange={handleChange}
            error={errors.name?.[0]}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {t.common.phone}
          </label>
          <Input
            name="phone"
            placeholder="01XXXXXXXXX"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone?.[0]}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {t.common.address}
          </label>
          <Input
            name="address"
            placeholder="যেমন: চকবাজার, ঢাকা"
            value={formData.address}
            onChange={handleChange}
            error={errors.address?.[0]}
          />
        </div>

        {!isEditing && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              প্রারম্ভিক বকেয়া বাকি (Opening Due ৳)
            </label>
            <Input
              type="number"
              step="any"
              name="openingDueTaka"
              placeholder="0"
              value={formData.openingDueTaka}
              onChange={handleChange}
              error={errors.openingDueTaka?.[0]}
            />
            <p className="text-[11px] text-zinc-400">
              পূর্বে কোন বাকি থেকে থাকলে তা এখানে লিখুন, স্বয়ংক্রিয়ভাবে খাতা তৈরি হবে।
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" isLoading={loading}>
            {t.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
