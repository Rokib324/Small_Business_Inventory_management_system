"use client";

import Link from "next/link";
import { WifiOff, ShoppingCart, Users, CreditCard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <WifiOff className="h-8 w-8 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            আপনি বর্তমানে অফলাইনে আছেন
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            কোনো সমস্যা নেই! বাকি (Baki) অফলাইনেও চালু থাকে। আপনি নতুন বিক্রি সম্পন্ন করতে, পেমেন্ট জমা নিতে এবং নতুন কাস্টমার যোগ করতে পারবেন। ইন্টারনেট এলে স্বয়ংক্রিয়ভাবে সিঙ্ক হয়ে যাবে।
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 pt-2">
          <Link href="/sales/new">
            <Button className="w-full justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6 font-medium shadow-sm">
              <ShoppingCart className="h-4 w-4" />
              নতুন বিক্রি করুন (অফলাইন)
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/payments">
              <Button variant="outline" className="w-full justify-center gap-1.5 rounded-xl py-5 text-xs font-medium">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                পেমেন্ট রিসিভ
              </Button>
            </Link>

            <Link href="/customers">
              <Button variant="outline" className="w-full justify-center gap-1.5 rounded-xl py-5 text-xs font-medium">
                <Users className="h-4 w-4 text-emerald-600" />
                কাস্টমার খাতা
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            সংযোগ পরীক্ষা করুন / রিলোড
          </button>
        </div>
      </div>
    </div>
  );
}
