"use client";

import { useState, useEffect } from "react";
import { Product, Customer, PaymentMethod } from "@prisma/client";
import { formatMoneyBn, fromPoisha, toBanglaDigits, toPoisha } from "@/lib/money";
import { createSaleAction } from "../actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  AlertCircle,
  Receipt,
  CheckCircle,
  UserPlus,
  RotateCcw,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { CustomerFormModal } from "@/features/customers/components/customer-form-modal";
import {
  enqueueSyncAction,
  updateLocalProductStock,
  updateLocalCustomerBalance,
  cacheProducts,
  cacheCustomers,
  getOfflineCustomers,
  getOfflineProducts,
} from "@/lib/offline/db";
import { syncEngine } from "@/lib/offline/sync-engine";

interface NewSalePosProps {
  products: Product[];
  customers: Customer[];
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPriceTaka: number;
}

export function NewSalePos({ products: initialProducts, customers: initialCustomers }: NewSalePosProps) {
  const router = useRouter();

  // Dynamic available lists merged with IndexedDB cache
  const [availableProducts, setAvailableProducts] = useState<Product[]>(initialProducts);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>(initialCustomers);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Search & Cart states
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [discountTaka, setDiscountTaka] = useState<string>("0");
  const [paidTaka, setPaidTaka] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineSuccess, setOfflineSuccess] = useState<{
    invoiceNumber: string;
    totalTaka: number;
    paidTaka: number;
    dueTaka: number;
  } | null>(null);

  // Sync props into Dexie cache and merge any offline additions
  useEffect(() => {
    async function syncLocalDb() {
      try {
        // Cache initial products into Dexie
        await cacheProducts(
          initialProducts.map((p) => ({
            ...p,
            updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
          }))
        );

        // Cache initial customers into Dexie
        await cacheCustomers(
          initialCustomers.map((c) => ({
            ...c,
            updatedAt: c.updatedAt ? c.updatedAt.toISOString() : new Date().toISOString(),
          }))
        );

        // If shopId exists, read offline customers from Dexie to show in dropdown
        const firstShopId = initialProducts[0]?.shopId || initialCustomers[0]?.shopId;
        if (firstShopId) {
          const offlineCusts = await getOfflineCustomers(firstShopId);
          if (offlineCusts.length > 0) {
            setAvailableCustomers((prev) => {
              const existingIds = new Set(prev.map((c) => c.id));
              const merged = [...prev];
              for (const oc of offlineCusts) {
                if (!existingIds.has(oc.id)) {
                  merged.push(oc as unknown as Customer);
                }
              }
              return merged;
            });
          }

          const offlineProds = await getOfflineProducts(firstShopId);
          if (offlineProds.length > 0) {
            setAvailableProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const merged = [...prev];
              for (const op of offlineProds) {
                if (!existingIds.has(op.id)) {
                  merged.push(op as unknown as Product);
                }
              }
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn("[NewSalePos] Failed to sync Dexie cache:", err);
      }
    }

    syncLocalDb();
  }, [initialProducts, initialCustomers]);

  // Filtered products for fast lookup
  const searchResults = productQuery.trim()
    ? availableProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(productQuery.toLowerCase()))
      )
    : availableProducts.slice(0, 8); // default show first 8 products

  const addToCart = (product: Product) => {
    setCart((prev) => {
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
          unitPriceTaka: fromPoisha(product.sellPricePoisha),
        },
      ];
    });
    setProductQuery("");
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const updatePrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, unitPriceTaka: Math.max(0, price) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const subtotalTaka = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceTaka,
    0
  );

  const numDiscount = Math.min(subtotalTaka, Math.max(0, parseFloat(discountTaka) || 0));
  const totalPayableTaka = Math.max(0, subtotalTaka - numDiscount);

  const numPaid = Math.min(totalPayableTaka, Math.max(0, parseFloat(paidTaka) || 0));
  const remainingDueTaka = Math.max(0, totalPayableTaka - numPaid);

  const handleFullPayment = () => {
    setPaidTaka(String(totalPayableTaka));
  };

  const handleZeroPayment = () => {
    setPaidTaka("0");
  };

  const selectedCustomer = availableCustomers.find((c) => c.id === selectedCustomerId);

  const handleOfflineSaleSubmit = async () => {
    const clientId = crypto.randomUUID();
    const offlineInvoice = `অফলাইন-${clientId.slice(0, 8).toUpperCase()}`;

    await enqueueSyncAction(
      "CREATE_SALE",
      {
        clientId,
        invoiceNumber: offlineInvoice,
        customerId: selectedCustomerId || null,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPricePoisha: toPoisha(item.unitPriceTaka),
        })),
        discountPoisha: toPoisha(numDiscount),
        paidPoisha: toPoisha(numPaid),
        paymentMethod,
        notes: notes.trim() || null,
      },
      clientId
    );

    // Optimistically update Dexie stock and local availableProducts state
    for (const item of cart) {
      await updateLocalProductStock(item.product.id, -item.quantity);
      setAvailableProducts((prev) =>
        prev.map((p) =>
          p.id === item.product.id
            ? { ...p, cachedStock: p.cachedStock - item.quantity }
            : p
        )
      );
    }

    // Optimistically update Dexie customer balance
    if (remainingDueTaka > 0 && selectedCustomerId) {
      const duePoisha = toPoisha(remainingDueTaka);
      await updateLocalCustomerBalance(selectedCustomerId, duePoisha);
      setAvailableCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomerId
            ? { ...c, cachedBalancePoisha: c.cachedBalancePoisha + duePoisha }
            : c
        )
      );
    }

    syncEngine.refreshCounts();

    setOfflineSuccess({
      invoiceNumber: offlineInvoice,
      totalTaka: totalPayableTaka,
      paidTaka: numPaid,
      dueTaka: remainingDueTaka,
    });

    setCart([]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError("অনুগ্রহ করে অন্তত একটি পণ্য যোগ করুন");
      return;
    }

    if (remainingDueTaka > 0 && !selectedCustomerId) {
      setError("বাকি বিক্রির জন্য কাস্টমার নির্বাচন করা আবশ্যক!");
      return;
    }

    setLoading(true);

    // Offline check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await handleOfflineSaleSubmit();
      return;
    }

    try {
      const res = await createSaleAction({
        customerId: selectedCustomerId || null,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPriceTaka: item.unitPriceTaka,
        })),
        discountTaka: numDiscount,
        paidTaka: numPaid,
        paymentMethod,
        notes,
      });

      if (!res.success || !res.data) {
        setError(res.message || "চালান তৈরি করা সম্ভব হয়নি");
        setLoading(false);
        return;
      }

      router.push(`/sales/${res.data.saleId}`);
    } catch {
      // Fallback seamlessly to offline sale queue on network drop
      await handleOfflineSaleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
            {t.sales.newSale}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            পণ্য নির্বাচন করুন, দর ও পরিমাণ বসিয়ে দ্রুত রসিদ তৈরি করুন
          </p>
        </div>
      </div>

      {/* Offline Success Banner Modal */}
      {offlineSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                অফলাইন বিক্রয় সফলভাবে সংরক্ষিত হয়েছে!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                চালান নং: <span className="font-mono font-bold">{offlineSuccess.invoiceNumber}</span> | মোট: ৳{toBanglaDigits(offlineSuccess.totalTaka)} (নগদ: ৳{toBanglaDigits(offlineSuccess.paidTaka)}, বাকি: ৳{toBanglaDigits(offlineSuccess.dueTaka)})
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                ইন্টারনেট সংযোগ ফিরলে এটি স্বয়ংক্রিয়ভাবে সার্ভারে সিঙ্ক হবে।
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setOfflineSuccess(null)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            পরের বিক্রি করুন
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* POS Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Search & Cart (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Fast Product Search */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="পণ্য খুঁজুন (নাম বা বারকোড লিখে)..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  className="pl-9 h-11 text-base"
                />
              </div>

              {/* Instant Search Results Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="flex flex-col text-left p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition cursor-pointer group"
                  >
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-emerald-700">
                      {product.name}
                    </span>
                    <div className="flex items-center justify-between text-[11px] mt-1 text-zinc-500">
                      <span>{formatMoneyBn(product.sellPricePoisha)}</span>
                      <span className="font-mono text-[10px]">
                        স্টক: {toBanglaDigits(product.cachedStock)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cart Table */}
          <Card className="overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>নির্বাচিত পণ্যসমূহ</span>
                <Badge variant="secondary">
                  {toBanglaDigits(cart.length)} টি আইটেম
                </Badge>
              </CardTitle>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  সব মুছুন
                </button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="p-10 text-center text-zinc-400 text-sm">
                  কোন পণ্য যুক্ত করা হয়নি। ওপরের তালিকা থেকে পণ্য নির্বাচন করুন।
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 text-[11px]">
                      <tr>
                        <th className="px-3 py-2">পণ্য</th>
                        <th className="px-3 py-2 w-28 text-center">পরিমাণ</th>
                        <th className="px-3 py-2 w-24">দর (৳)</th>
                        <th className="px-3 py-2 text-right">মোট (৳)</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {cart.map((item) => (
                        <tr key={item.product.id}>
                          <td className="px-3 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.product.name}
                            <span className="block text-[10px] text-zinc-400 font-normal">
                              {item.product.unit}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.product.id, item.quantity - 1)
                                }
                                className="h-7 w-7 rounded-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 cursor-pointer"
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
                                className="w-12 h-7 text-center rounded border border-zinc-200 dark:border-zinc-700 text-xs font-bold"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.product.id, item.quantity + 1)
                                }
                                className="h-7 w-7 rounded-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="any"
                              value={item.unitPriceTaka}
                              onChange={(e) =>
                                updatePrice(
                                  item.product.id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20 h-7 px-1.5 text-right rounded border border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
                            />
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                            {formatMoneyBn(
                              Math.round(item.quantity * item.unitPriceTaka * 100)
                            )}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer Selection & Payment Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Selector Card */}
            <Card>
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600" />
                  {t.sales.selectCustomer}
                </CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCustomerModal(true)}
                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 gap-1 rounded-lg"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  নতুন খদ্দের
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">{t.sales.walkInCustomer}</option>
                  {availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""} — বাকি: {formatMoneyBn(c.cachedBalancePoisha)}
                    </option>
                  ))}
                </select>

                {selectedCustomer && (
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs space-y-1">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedCustomer.name}
                    </p>
                    <div className="flex justify-between text-zinc-500">
                      <span>বর্তমান পূর্বের বাকি:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {formatMoneyBn(selectedCustomer.cachedBalancePoisha)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing & Settlement Card */}
            <Card className="border-emerald-200 dark:border-emerald-900/50">
              <CardHeader className="p-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  হিসাব ও অর্থ পরিশোধ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">{t.common.subtotal}</span>
                  <span className="font-bold text-base">
                    {formatMoneyBn(Math.round(subtotalTaka * 100))}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs text-zinc-500">{t.common.discount} (৳)</span>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={discountTaka}
                      onChange={(e) => setDiscountTaka(e.target.value)}
                      className="text-right h-8 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Net Total */}
                <div className="flex justify-between items-center text-sm font-bold py-1 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-800 dark:text-zinc-200">{t.common.total}</span>
                  <span className="text-lg text-emerald-600 dark:text-emerald-400">
                    {formatMoneyBn(Math.round(totalPayableTaka * 100))}
                  </span>
                </div>

                {/* Cash/Payment Received */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {t.common.paid} (৳)
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleFullPayment}
                        className="h-6 px-2 text-[10px] rounded"
                      >
                        পুরো পরিশোধ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleZeroPayment}
                        className="h-6 px-2 text-[10px] rounded"
                      >
                        পুরো বাকি
                      </Button>
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={paidTaka}
                    onChange={(e) => setPaidTaka(e.target.value)}
                    className="text-right h-10 text-base font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    পরিশোধের মাধ্যম
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="flex h-9 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value={PaymentMethod.CASH}>ক্যাশ (নগদ টাকা)</option>
                    <option value={PaymentMethod.BKASH}>বিকাশ (bKash)</option>
                    <option value={PaymentMethod.NAGAD}>নগদ (Nagad)</option>
                    <option value={PaymentMethod.BANK}>ব্যাংক ট্রান্সফার</option>
                  </select>
                </div>

                {/* Due Amount Highlight */}
                <div
                  className={`p-3 rounded-xl flex justify-between items-center ${
                    remainingDueTaka > 0
                      ? "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
                      : "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    {remainingDueTaka > 0 ? t.common.due : "পরিশোধিত"}
                  </span>
                  <span className="text-base font-bold">
                    {formatMoneyBn(Math.round(remainingDueTaka * 100))}
                  </span>
                </div>

                {/* Note / Memo */}
                <div>
                  <Input
                    placeholder="নোট বা চালান সংক্রান্ত মন্তব্য (ঐচ্ছিক)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Checkout Submit CTA */}
                <Button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition"
                >
                  {loading ? (
                    "চালান তৈরি হচ্ছে..."
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-1" />
                      {t.sales.completeSale}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>

      {/* Customer Form Modal for instant additions in POS */}
      {showCustomerModal && (
        <CustomerFormModal
          open={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onCustomerCreated={(newCust) => {
            setAvailableCustomers((prev) => [newCust as unknown as Customer, ...prev]);
            setSelectedCustomerId(newCust.id);
          }}
        />
      )}
    </div>
  );
}
