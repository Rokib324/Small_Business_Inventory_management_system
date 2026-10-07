"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupplierAction, updateSupplierAction } from "../actions";
import { Supplier } from "@prisma/client";

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
}

export function SupplierFormModal({
  open,
  onClose,
  supplierToEdit,
}: SupplierFormModalProps) {
  const isEditing = !!supplierToEdit;

  const [formData, setFormData] = useState({
    name: supplierToEdit?.name || "",
    companyName: supplierToEdit?.companyName || "",
    phone: supplierToEdit?.phone || "",
    address: supplierToEdit?.address || "",
    openingPayableTaka: "0",
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

    if (isEditing && supplierToEdit) {
      const res = await updateSupplierAction({
        id: supplierToEdit.id,
        name: formData.name,
        companyName: formData.companyName,
        phone: formData.phone,
        address: formData.address,
      });

      if (!res.success) {
        setGeneralError(res.message || "মহাজন আপডেট করতে সমস্যা হয়েছে");
        if (res.errors) setErrors(res.errors);
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
      }
    } else {
      const openingPayable = parseFloat(formData.openingPayableTaka) || 0;
      const res = await createSupplierAction({
        name: formData.name,
        companyName: formData.companyName,
        phone: formData.phone,
        address: formData.address,
        openingPayableTaka: openingPayable,
      });

      if (!res.success) {
        setGeneralError(res.message || "মহাজন তৈরি করতে সমস্যা হয়েছে");
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
      title={isEditing ? "মহাজন তথ্য সম্পাদনা" : "নতুন মহাজন / সাপ্লায়ার যোগ করুন"}
      description={
        isEditing
          ? "সাপ্লায়ারের নাম, প্রতিষ্ঠানের নাম ও যোগাযোগ তথ্য পরিবর্তন করুন"
          : "পণ্য সরবরাহকারী মহাজনের নাম ও পূর্বের দেনা (যদি থাকে) অন্তর্ভুক্ত করুন"
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
            মহাজনের নাম *
          </label>
          <Input
            name="name"
            placeholder="যেমন: হাজী আবুল কালাম"
            value={formData.name}
            onChange={handleChange}
            error={errors.name?.[0]}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            কোম্পানি / প্রতিষ্ঠানের নাম
          </label>
          <Input
            name="companyName"
            placeholder="যেমন: কালাম স্টিল এন্ড পাইপ সাপ্লাইয়ার্স"
            value={formData.companyName}
            onChange={handleChange}
            error={errors.companyName?.[0]}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            মোবাইল নম্বর
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
            ঠিকানা
          </label>
          <Input
            name="address"
            placeholder="যেমন: টঙ্গী শিল্প এলাকা, ঢাকা"
            value={formData.address}
            onChange={handleChange}
            error={errors.address?.[0]}
          />
        </div>

        {!isEditing && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              প্রারম্ভিক বকেয়া দেনা (What I owe to Supplier ৳)
            </label>
            <Input
              type="number"
              step="any"
              name="openingPayableTaka"
              placeholder="0"
              value={formData.openingPayableTaka}
              onChange={handleChange}
              error={errors.openingPayableTaka?.[0]}
            />
            <p className="text-[11px] text-zinc-400">
              মহাজনের পূর্বে কোনো পাওনা থাকলে তা এখানে লিখুন, দেনা হিসেবে জমা হবে।
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={onClose}>
            বাতিল
          </Button>
          <Button type="submit" isLoading={loading}>
            সংরক্ষণ করুন
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
