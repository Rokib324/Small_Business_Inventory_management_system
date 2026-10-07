"use client";

import { Dialog } from "@/components/ui/dialog";
import { Product } from "@prisma/client";
import { StockAdjustmentForm } from "./stock-adjustment-form";
import { SlidersHorizontal } from "lucide-react";

interface StockAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  products?: Product[];
  onSuccess?: () => void;
}

export function StockAdjustmentModal({
  open,
  onClose,
  product,
  products = [],
  onSuccess,
}: StockAdjustmentModalProps) {
  return (
    <Dialog open={open} onClose={onClose} title="স্টক সমন্বয়">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
            স্টক সমন্বয় (Stock Adjustment)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            নষ্ট, মেয়াদোত্তীর্ণ অথবা গণনা সংশোধনের জন্য স্টক পরিবর্তন করুন
          </p>
        </div>

        <StockAdjustmentForm
          product={product}
          products={products}
          onSuccess={() => {
            onClose();
            if (onSuccess) onSuccess();
          }}
          onCancel={onClose}
        />
      </div>
    </Dialog>
  );
}
