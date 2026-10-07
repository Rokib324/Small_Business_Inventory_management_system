"use client";

import { useState, useTransition } from "react";
import { Product } from "@prisma/client";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { ProductFormModal } from "./product-form-modal";
import { deleteProductAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  History,
  SlidersHorizontal,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { StockAdjustmentModal } from "./stock-adjustment-modal";
import Link from "next/link";

interface ProductListViewProps {
  products: Product[];
}

export function ProductListView({ products }: ProductListViewProps) {
  const [search, setSearch] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

    const matchesStock = filterLowStock
      ? p.cachedStock <= p.lowStockThreshold
      : true;

    return matchesSearch && matchesStock;
  });

  const lowStockCount = products.filter(
    (p) => p.cachedStock <= p.lowStockThreshold
  ).length;

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`আপনি কি নিশ্চিত যে "${name}" পণ্যটি মুছে ফেলতে চান?`)) {
      startTransition(async () => {
        await deleteProductAction(id);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            {t.products.title}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            মোট পণ্য: {toBanglaDigits(products.length)} টি | স্টক সতর্কতা:{" "}
            {toBanglaDigits(lowStockCount)} টি
          </p>
        </div>

        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {t.products.addNew}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="পণ্যের নাম বা বারকোড খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterLowStock(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                !filterLowStock
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              সব পণ্য ({toBanglaDigits(products.length)})
            </button>
            <button
              onClick={() => setFilterLowStock(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                filterLowStock
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              কম স্টক ({toBanglaDigits(lowStockCount)})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3.5 font-semibold">পণ্যের বিবরণ</th>
                <th className="px-4 py-3.5 font-semibold">একক</th>
                <th className="px-4 py-3.5 font-semibold">ক্রয় মূল্য</th>
                <th className="px-4 py-3.5 font-semibold">বিক্রয় মূল্য</th>
                <th className="px-4 py-3.5 font-semibold">বর্তমান স্টক</th>
                <th className="px-4 py-3.5 font-semibold">অবস্থা</th>
                <th className="px-4 py-3.5 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    কোন পণ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.cachedStock <= p.lowStockThreshold;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {p.name}
                        </div>
                        {p.sku && (
                          <div className="text-xs text-zinc-400 font-mono mt-0.5">
                            {p.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {formatMoneyBn(p.buyPricePoisha)}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatMoneyBn(p.sellPricePoisha)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-bold ${
                            isLow
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {toBanglaDigits(p.cachedStock)} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {isLow ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            কম স্টক
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            পর্যাপ্ত
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${p.id}/history`}
                            title="স্টক ইতিহাস"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          >
                            <History className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setAdjustingProduct(p)}
                            title="স্টক সমন্বয়"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(p)}
                            title="সম্পাদনা"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={isPending}
                            title="মুছে ফেলুন"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <ProductFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          productToEdit={editingProduct}
        />
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <StockAdjustmentModal
          open={!!adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          product={adjustingProduct}
        />
      )}
    </div>
  );
}
