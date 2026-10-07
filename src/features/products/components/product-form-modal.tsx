"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { productUnits } from "../schemas";
import { createProductAction, updateProductAction } from "../actions";
import { fromPoisha } from "@/lib/money";
import { t } from "@/lib/i18n";
import { Product } from "@prisma/client";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export function ProductFormModal({
  open,
  onClose,
  productToEdit,
}: ProductFormModalProps) {
  const isEditing = !!productToEdit;

  const [formData, setFormData] = useState({
    name: productToEdit?.name || "",
    sku: productToEdit?.sku || "",
    unit: (productToEdit?.unit as (typeof productUnits)[number]) || "PCS",
    buyPriceTaka: productToEdit ? String(fromPoisha(productToEdit.buyPricePoisha)) : "",
    sellPriceTaka: productToEdit ? String(fromPoisha(productToEdit.sellPricePoisha)) : "",
    initialStock: "0",
    lowStockThreshold: productToEdit ? String(productToEdit.lowStockThreshold) : "5",
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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

    const buyPrice = parseFloat(formData.buyPriceTaka) || 0;
    const sellPrice = parseFloat(formData.sellPriceTaka) || 0;
    const lowStock = parseInt(formData.lowStockThreshold, 10) || 5;

    if (isEditing && productToEdit) {
      const res = await updateProductAction({
        id: productToEdit.id,
        name: formData.name,
        sku: formData.sku,
        unit: formData.unit,
        buyPriceTaka: buyPrice,
        sellPriceTaka: sellPrice,
        lowStockThreshold: lowStock,
      });

      if (!res.success) {
        setGeneralError(res.message || "পণ্য আপডেট করতে সমস্যা হয়েছে");
        if (res.errors) setErrors(res.errors);
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
      }
    } else {
      const stock = parseInt(formData.initialStock, 10) || 0;
      const res = await createProductAction({
        name: formData.name,
        sku: formData.sku,
        unit: formData.unit,
        buyPriceTaka: buyPrice,
        sellPriceTaka: sellPrice,
        initialStock: stock,
        lowStockThreshold: lowStock,
      });

      if (!res.success) {
        setGeneralError(res.message || "পণ্য তৈরি করতে সমস্যা হয়েছে");
        if (res.errors) setErrors(res.errors);
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
      }
    }
  };

  const unitLabels: Record<string, string> = {
    PCS: "পিস (PCS)",
    KG: "কেজি (KG)",
    FT: "ফুট (FT)",
    BAG: "বস্তা (BAG)",
    BOX: "বক্স (BOX)",
    LTR: "লিটার (LTR)",
    MTR: "মিটার (MTR)",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "পণ্য সম্পাদনা করুন" : "নতুন পণ্য যোগ করুন"}
      description={
        isEditing
          ? "পণ্যের নাম, মূল্য এবং স্টক লেভেল পরিবর্তন করুন"
          : "দোকানের ইনভেন্টরিতে নতুন পণ্য অন্তর্ভুক্ত করুন"
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
            {t.products.productName} *
          </label>
          <Input
            name="name"
            placeholder="যেমন: ১/২ ইঞ্চি জিআই পাইপ"
            value={formData.name}
            onChange={handleChange}
            error={errors.name?.[0]}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.products.sku}
            </label>
            <Input
              name="sku"
              placeholder="GIP-05"
              value={formData.sku}
              onChange={handleChange}
              error={errors.sku?.[0]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.products.unit} *
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {productUnits.map((u) => (
                <option key={u} value={u}>
                  {unitLabels[u] || u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.products.buyPrice} (৳) *
            </label>
            <Input
              type="number"
              step="any"
              name="buyPriceTaka"
              placeholder="380"
              value={formData.buyPriceTaka}
              onChange={handleChange}
              error={errors.buyPriceTaka?.[0]}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.products.sellPrice} (৳) *
            </label>
            <Input
              type="number"
              step="any"
              name="sellPriceTaka"
              placeholder="450"
              value={formData.sellPriceTaka}
              onChange={handleChange}
              error={errors.sellPriceTaka?.[0]}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {!isEditing && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                প্রারম্ভিক স্টক (Initial Stock)
              </label>
              <Input
                type="number"
                name="initialStock"
                placeholder="50"
                value={formData.initialStock}
                onChange={handleChange}
                error={errors.initialStock?.[0]}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {t.products.lowStockAlert}
            </label>
            <Input
              type="number"
              name="lowStockThreshold"
              placeholder="5"
              value={formData.lowStockThreshold}
              onChange={handleChange}
              error={errors.lowStockThreshold?.[0]}
            />
          </div>
        </div>

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
