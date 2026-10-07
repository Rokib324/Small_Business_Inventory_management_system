"use client";

import { useState, useTransition } from "react";
import { Customer } from "@prisma/client";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import { CustomerFormModal } from "./customer-form-modal";
import { deleteCustomerAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  BookOpen,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { t } from "@/lib/i18n";

interface CustomerListViewProps {
  customers: Customer[];
}

export function CustomerListView({ customers }: CustomerListViewProps) {
  const [search, setSearch] = useState("");
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));

    const matchesDue = filterDueOnly ? c.cachedBalancePoisha > 0 : true;

    return matchesSearch && matchesDue;
  });

  const dueCustomersCount = customers.filter(
    (c) => c.cachedBalancePoisha > 0
  ).length;

  const totalDuePoisha = customers.reduce(
    (acc, c) => acc + (c.cachedBalancePoisha > 0 ? c.cachedBalancePoisha : 0),
    0
  );

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`আপনি কি নিশ্চিত যে "${name}" কাস্টমার মুছে ফেলতে চান?`)) {
      startTransition(async () => {
        await deleteCustomerAction(id);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            {t.customers.title}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            মোট কাস্টমার: {toBanglaDigits(customers.length)} জন | মোট বকেয়া বাকি:{" "}
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {formatMoneyBn(totalDuePoisha)}
            </span>
          </p>
        </div>

        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {t.customers.addNew}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="কাস্টমারের নাম বা ফোন নম্বর খুঁজুন..."
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
              সব কাস্টমার ({toBanglaDigits(customers.length)})
            </button>
            <button
              onClick={() => setFilterDueOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                filterDueOnly
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              বাকি আছে ({toBanglaDigits(dueCustomersCount)})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3.5 font-semibold">কাস্টমারের নাম ও ঠিকানা</th>
                <th className="px-4 py-3.5 font-semibold">মোবাইল নম্বর</th>
                <th className="px-4 py-3.5 font-semibold">বর্তমান বাকি (Due)</th>
                <th className="px-4 py-3.5 font-semibold">অবস্থা</th>
                <th className="px-4 py-3.5 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    কোন কাস্টমার পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const hasDue = c.cachedBalancePoisha > 0;
                  const hasAdvance = c.cachedBalancePoisha < 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {c.name}
                        </div>
                        {c.address && (
                          <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {c.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.phone ? (
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-zinc-400" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-bold text-sm ${
                            hasDue
                              ? "text-rose-600 dark:text-rose-400"
                              : hasAdvance
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatMoneyBn(c.cachedBalancePoisha)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {hasDue ? (
                          <Badge variant="warning" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            বাকি
                          </Badge>
                        ) : hasAdvance ? (
                          <Badge variant="secondary" className="gap-1">
                            অগ্রিম
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
                            href={`/customers/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                          >
                            <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                            খাতা দেখুন
                          </Link>
                          <button
                            onClick={() => handleEdit(c)}
                            title="সম্পাদনা"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <CustomerFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customerToEdit={editingCustomer}
        />
      )}
    </div>
  );
}
