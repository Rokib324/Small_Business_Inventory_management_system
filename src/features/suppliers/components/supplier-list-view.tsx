"use client";

import { useState, useTransition } from "react";
import { Supplier } from "@prisma/client";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { SupplierFormModal } from "./supplier-form-modal";
import { deleteSupplierAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Truck,
  Plus,
  Search,
  Phone,
  MapPin,
  Building,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";

interface SupplierListViewProps {
  suppliers: Supplier[];
}

export function SupplierListView({ suppliers }: SupplierListViewProps) {
  const [search, setSearch] = useState("");
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.companyName && s.companyName.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search));

    const matchesDue = filterDueOnly ? s.cachedBalancePoisha > 0 : true;

    return matchesSearch && matchesDue;
  });

  const dueSuppliersCount = suppliers.filter((s) => s.cachedBalancePoisha > 0).length;

  const totalPayablePoisha = suppliers.reduce(
    (acc, s) => acc + (s.cachedBalancePoisha > 0 ? s.cachedBalancePoisha : 0),
    0
  );

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`আপনি কি নিশ্চিত যে "${name}" মহাজনকে মুছে ফেলতে চান?`)) {
      startTransition(async () => {
        await deleteSupplierAction(id);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Truck className="h-6 w-6 text-purple-600" />
            মহাজন / সাপ্লায়ার তালিকা
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            মোট সাপ্লায়ার: {toBanglaDigits(suppliers.length)} জন | মহাজন দেনা:{" "}
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {formatMoneyBn(totalPayablePoisha)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/suppliers/due-list">
            <Button variant="outline" className="gap-1.5">
              মহাজন দেনা খাতা
            </Button>
          </Link>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            নতুন মহাজন
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="মহাজন, প্রতিষ্ঠান বা ফোন নম্বর খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterDueOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                !filterDueOnly
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              সব মহাজন ({toBanglaDigits(suppliers.length)})
            </button>
            <button
              onClick={() => setFilterDueOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                filterDueOnly
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              দেনা আছে ({toBanglaDigits(dueSuppliersCount)})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3.5 font-semibold">মহাজন ও প্রতিষ্ঠান</th>
                <th className="px-4 py-3.5 font-semibold">মোবাইল নম্বর</th>
                <th className="px-4 py-3.5 font-semibold">দোকানের দেনা (Payable)</th>
                <th className="px-4 py-3.5 font-semibold">অবস্থা</th>
                <th className="px-4 py-3.5 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    কোন সাপ্লায়ার পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => {
                  const hasPayable = s.cachedBalancePoisha > 0;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {s.name}
                        </div>
                        {s.companyName && (
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3" />
                            {s.companyName}
                          </div>
                        )}
                        {s.address && (
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {s.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.phone ? (
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-zinc-400" />
                            {s.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-bold text-sm ${
                            hasPayable
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatMoneyBn(s.cachedBalancePoisha)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {hasPayable ? (
                          <Badge variant="warning" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            দেনা আছে
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            পরিশোধিত
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/purchases/new?supplierId=${s.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                            title="মাল ক্রয় করুন"
                          >
                            <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
                            ক্রয়
                          </Link>
                          <button
                            onClick={() => handleEdit(s)}
                            title="সম্পাদনা"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
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

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <SupplierFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          supplierToEdit={editingSupplier}
        />
      )}
    </div>
  );
}
