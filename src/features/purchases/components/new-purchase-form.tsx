"use client";

import { useState } from "react";
import { Product, Supplier, PaymentMethod } from "@prisma/client";
import { formatMoneyBn, fromPoisha, toBanglaDigits } from "@/lib/money";
import { createPurchaseAction } from "../actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Truck,
  Trash2,
  Plus,
  Minus,
  Building2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { t } from "@/lib/i18n";
import Link from "next/link";

interface NewPurchaseFormProps {
  products: Product[];
  suppliers: Supplier[];
}

interface PurchaseItemState {
  product: Product;
  quantity: number;
  buyPriceTaka: number;
}

export function NewPurchaseForm({ products, suppliers }: NewPurchaseFormProps) {
  const router = useRouter();

  // Search & Cart states
  const [productQuery, setProductQuery] = useState("");
  const [items, setItems] = useState<PurchaseItemState[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [paidTaka, setPaidTaka] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered products for quick lookup
  const searchResults = productQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(productQuery.toLowerCase()))
      )
    : products.slice(0, 6);

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          buyPriceTaka: fromPoisha(product.buyPricePoisha),
        },
      ];
    });
    setProductQuery("");
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const updateBuyPrice = (productId: string, priceTaka: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, buyPriceTaka: Math.max(0, priceTaka) }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Computations
  const subtotalTaka = items.reduce(
    (sum, item) => sum + item.quantity * item.buyPriceTaka,
    0
  );
  const totalTaka = subtotalTaka;
  const numPaidTaka = Number(paidTaka) || 0;
  const dueTaka = Math.max(0, totalTaka - numPaidTaka);

  const handlePayInFull = () => {
    setPaidTaka(totalTaka.toString());
  };

  const handlePayZero = () => {
    setPaidTaka("0");
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError("কমপক্ষে একটি পণ্য যোগ করুন।");
      return;
    }

    if (dueTaka > 0 && !selectedSupplierId) {
      setError("বাকি ক্রয়ের জন্য সাপ্লায়ার (মহাজন) নির্বাচন করা আবশ্যক।");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createPurchaseAction({
      supplierId: selectedSupplierId || null,
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        buyPriceTaka: i.buyPriceTaka,
      })),
      paidTaka: numPaidTaka,
      paymentMethod,
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.message || "ক্রয় সম্পন্ন করতে সমস্যা হয়েছে।");
      return;
    }

    router.push("/purchases");
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/purchases">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Truck className="h-6 w-6 text-emerald-600" />
              {t.purchases.newPurchase}
            </h1>
            <p className="text-sm text-zinc-500">
              মহাজনের কাছ থেকে মালামাল ক্রয় এবং স্টক বৃদ্ধি
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Picker & Selected Items */}
        <div className="lg:col-span-8 space-y-6">
          {/* Supplier Selector */}
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                {t.purchases.selectSupplier}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <select
                    className="w-full h-11 px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                  >
                    <option value="">-- সাধারণ নগদ ক্রয় (কোন মহাজন নেই) --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.companyName ? `(${s.companyName})` : ""} - দেনা: {formatMoneyBn(s.cachedBalancePoisha)}
                      </option>
                    ))}
                  </select>
                </div>
                <Link href="/suppliers">
                  <Button variant="outline" className="rounded-xl h-11 gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" />
                    নতুন মহাজন
                  </Button>
                </Link>
              </div>

              {selectedSupplier && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 text-sm flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedSupplier.name}
                    </span>
                    {selectedSupplier.companyName && (
                      <span className="text-zinc-500 ml-2">
                        • {selectedSupplier.companyName}
                      </span>
                    )}
                    {selectedSupplier.phone && (
                      <span className="text-zinc-500 ml-2">
                        • {selectedSupplier.phone}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 block">পূর্বের দেনা</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatMoneyBn(selectedSupplier.cachedBalancePoisha)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Lookup & Add */}
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Search className="h-5 w-5 text-emerald-600" />
                পণ্য নির্বাচন করুন
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                <Input
                  className="pl-10 h-11 rounded-xl"
                  placeholder="পণ্যের নাম অথবা বারকোড খুঁজুন..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {searchResults.map((product) => {
                  const isAdded = items.some((i) => i.product.id === product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addItem(product)}
                      className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                        isAdded
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-400"
                      }`}
                    >
                      <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {product.name}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-zinc-500">
                          বর্তমান স্টক:{" "}
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            {toBanglaDigits(product.cachedStock)} {product.unit}
                          </span>
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoneyBn(product.buyPricePoisha)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Purchase Line Items */}
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                ক্রয়কৃত পণ্যের তালিকা ({toBanglaDigits(items.length)})
              </CardTitle>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems([])}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 text-xs"
                >
                  সব খালি করুন
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {items.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <Truck className="h-10 w-10 mx-auto stroke-1 opacity-50 mb-2" />
                  <p className="text-sm">এখনও কোন পণ্য নির্বাচন করা হয়নি।</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    উপরের তালিকা থেকে মালামাল সিলেক্ট করুন
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          একক: {item.product.unit} • বর্তমান স্টক: {toBanglaDigits(item.product.cachedStock)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden h-9 bg-zinc-50 dark:bg-zinc-800">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="px-2.5 h-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.product.id,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-14 text-center text-sm font-semibold bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="px-2.5 h-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Buy Price input (in Taka) */}
                        <div className="flex items-center gap-1.5 w-28">
                          <span className="text-xs text-zinc-400">দর ৳</span>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={item.buyPriceTaka}
                            onChange={(e) =>
                              updateBuyPrice(
                                item.product.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 px-2 text-right text-sm font-semibold rounded-lg"
                          />
                        </div>

                        {/* Line Subtotal */}
                        <div className="w-24 text-right">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {formatMoneyBn(Math.round(item.quantity * item.buyPriceTaka * 100))}
                          </span>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Totals, Payment & Submit */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-6">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                ক্রয় ও পরিশোধের হিসাব
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Total Calculation */}
              <div className="space-y-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <span>মোট ক্রয় বিল:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">
                    {formatMoneyBn(Math.round(totalTaka * 100))}
                  </span>
                </div>
              </div>

              {/* Paid input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    পরিশোধের পরিমাণ (নগদ জমা)
                  </label>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={handlePayInFull}
                      className="text-emerald-600 hover:underline font-semibold"
                    >
                      সম্পূর্ণ পরিশোধ
                    </button>
                    <span className="text-zinc-300">•</span>
                    <button
                      type="button"
                      onClick={handlePayZero}
                      className="text-zinc-500 hover:underline"
                    >
                      ০ (সম্পূর্ণ বাকি)
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-400 font-bold">
                    ৳
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="pl-8 h-11 text-lg font-bold rounded-xl"
                    value={paidTaka}
                    onChange={(e) => setPaidTaka(e.target.value)}
                  />
                </div>
              </div>

              {/* Due calculation preview */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  dueTaka > 0
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block uppercase">
                    {dueTaka > 0 ? "মহাজন বাকি (দেনা হবে)" : "সম্পূর্ণ পরিশোধিত"}
                  </span>
                  <span className="text-xs opacity-80">
                    {dueTaka > 0
                      ? selectedSupplier
                        ? `${selectedSupplier.name}-এর খাতায় যুক্ত হবে`
                        : "সাপ্লায়ার নির্বাচন প্রয়োজন"
                      : "কোন দেনা থাকবে না"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold">
                    {formatMoneyBn(Math.round(dueTaka * 100))}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  পরিশোধের মাধ্যম
                </label>
                <select
                  className="w-full h-11 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="CASH">নগদ (Cash)</option>
                  <option value="BKASH">বিকাশ (bKash)</option>
                  <option value="NAGAD">নগদ ডিজিটাল (Nagad)</option>
                  <option value="BANK">ব্যাংক ট্রান্সফার (Bank)</option>
                  <option value="CHEQUE">চেক (Cheque)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  নোট / মন্তব্য (ঐচ্ছিক)
                </label>
                <Input
                  className="h-10 rounded-xl"
                  placeholder="যেমন: চালান বা মেমো নং..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || items.length === 0}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm gap-2"
              >
                {loading ? (
                  "সংরক্ষণ করা হচ্ছে..."
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    ক্রয় সংরক্ষণ করুন
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
