"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Product } from "@prisma/client";
import { toBanglaDigits } from "@/lib/money";
import { adjustStockAction } from "../actions";
import { StockAdjustmentInput, stockAdjustmentReasons } from "../schemas";
import { reasonLabels } from "../stock-service";
import { ArrowDownRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface StockAdjustmentFormProps {
  product?: Product | null;
  products?: Product[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StockAdjustmentForm({
  product,
  products = [],
  onSuccess,
  onCancel,
}: StockAdjustmentFormProps) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState<string>(
    product?.id || (products[0]?.id || "")
  );
  const [adjustmentType, setAdjustmentType] = useState<"DECREASE" | "INCREASE">("DECREASE");
  const [quantity, setQuantity] = useState<string>("1");
  const [reason, setReason] = useState<StockAdjustmentInput["reason"]>("DAMAGE");
  const [note, setNote] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProduct = product || products.find((p) => p.id === selectedProductId);
  const currentStock = activeProduct?.cachedStock ?? 0;
  const numQuantity = parseInt(quantity, 10) || 0;
  const delta = adjustmentType === "INCREASE" ? numQuantity : -numQuantity;
  const projectedStock = Math.max(0, currentStock + delta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) {
      setError("পণ্য নির্বাচন করুন।");
      return;
    }

    if (numQuantity <= 0) {
      setError("সঠিক পরিমাণ লিখুন (০ এর বেশি)।");
      return;
    }

    if (adjustmentType === "DECREASE" && currentStock - numQuantity < 0) {
      setError(`স্টক ঋণাত্মক হতে পারে না। সর্বোচ্চ ${currentStock} কমানো সম্ভব।`);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await adjustStockAction({
      productId: activeProduct.id,
      adjustmentType,
      quantity: numQuantity,
      reason,
      note: note.trim() || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.message || "সমন্বয় সম্পন্ন করতে সমস্যা হয়েছে।");
      return;
    }

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/products");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Product selector or display */}
      {product ? (
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs text-zinc-400 font-medium block">নির্বাচিত পণ্য:</span>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
              {product.name}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
              বর্তমান স্টক: {toBanglaDigits(product.cachedStock)} {product.unit}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
            পণ্য নির্বাচন করুন *
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (বর্তমান স্টক: {toBanglaDigits(p.cachedStock)} {p.unit})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Adjustment Type Toggle */}
      <div>
        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
          সমন্বয়ের ধরন *
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setAdjustmentType("DECREASE");
              if (reason === "RETURN_CUSTOMER") setReason("DAMAGE");
            }}
            className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              adjustmentType === "DECREASE"
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 shadow-sm"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            <ArrowDownRight className="h-4 w-4 text-rose-600" />
            স্টক কমবে (-)
          </button>
          <button
            type="button"
            onClick={() => {
              setAdjustmentType("INCREASE");
              if (reason === "DAMAGE" || reason === "EXPIRY") setReason("COUNT_CORRECTION");
            }}
            className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              adjustmentType === "INCREASE"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            স্টক বাড়বে (+)
          </button>
        </div>
      </div>

      {/* Quantity and Reason */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
            পরিমাণ ({activeProduct?.unit || "PCS"}) *
          </label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-11 rounded-xl text-base font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
            কারণ নির্বাচন করুন *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as StockAdjustmentInput["reason"])}
            className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {stockAdjustmentReasons.map((r) => (
              <option key={r} value={r}>
                {reasonLabels[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Note input */}
      <div>
        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
          বিবরণ / নোট (ঐচ্ছিক)
        </label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="যেমন: গুদামে ভেজা সিমেন্ট বস্তা বাতিল করা হলো..."
          className="h-11 rounded-xl"
        />
      </div>

      {/* Stock Impact Preview */}
      {activeProduct && (
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between text-sm">
          <div>
            <span className="text-xs text-zinc-500 block">স্টকের পরিবর্তন:</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {toBanglaDigits(currentStock)} → {toBanglaDigits(projectedStock)} {activeProduct.unit}
            </span>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-bold ${
                adjustmentType === "INCREASE" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {adjustmentType === "INCREASE" ? "+" : "-"}
              {toBanglaDigits(numQuantity)} {activeProduct.unit}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-xl px-5 h-11"
          >
            বাতিল
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="rounded-xl px-6 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
        >
          {loading ? (
            "সংরক্ষণ হচ্ছে..."
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              সমন্বয় নিশ্চিত করুন
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
