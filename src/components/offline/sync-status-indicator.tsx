"use client";

import { useState } from "react";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Layers,
  RotateCcw,
} from "lucide-react";
import { toBanglaDigits } from "@/lib/money";
import { Button } from "@/components/ui/button";

export function SyncStatusIndicator() {
  const {
    status,
    pendingCount,
    failedCount,
    errorMessage,
    queue,
    triggerSync,
    retryFailed,
  } = useOfflineSync();

  const [isOpen, setIsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await triggerSync();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    setIsManualSyncing(true);
    try {
      await retryFailed();
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Determine pill status display
  let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  let icon = <Wifi className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />;
  let label = "অনলাইন";

  if (status === "OFFLINE") {
    badgeColor = "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700";
    icon = <WifiOff className="h-3.5 w-3.5 text-amber-600" />;
    label = pendingCount > 0 ? `অফলাইন (${toBanglaDigits(pendingCount)})` : "অফলাইন";
  } else if (status === "SYNCING" || isManualSyncing) {
    badgeColor = "bg-blue-50 text-blue-750 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700";
    icon = <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />;
    label = "সিঙ্ক হচ্ছে...";
  } else if (status === "AUTH_EXPIRED") {
    badgeColor = "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700";
    icon = <AlertCircle className="h-3.5 w-3.5 text-rose-600" />;
    label = "সেশন মেয়াদোত্তীর্ণ";
  } else if (failedCount > 0) {
    badgeColor = "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700";
    icon = <AlertCircle className="h-3.5 w-3.5 text-rose-600" />;
    label = `${toBanglaDigits(failedCount)}টি ব্যর্থ`;
  } else if (pendingCount > 0) {
    badgeColor = "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700";
    icon = <Clock className="h-3.5 w-3.5 text-sky-600" />;
    label = `${toBanglaDigits(pendingCount)}টি সিঙ্ক বাকি`;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border shadow-sm transition hover:opacity-90 ${badgeColor}`}
        title="সিঙ্ক ও অফলাইন অবস্থা"
      >
        {icon}
        <span>{label}</span>
      </button>

      {/* Modal / Dialog for detailed sync status */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in-0 zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    অফলাইন ডাটা ও সিঙ্ক অবস্থা
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {status === "ONLINE"
                      ? "ইন্টারনেট সক্রিয় আছে"
                      : status === "OFFLINE"
                      ? "ইন্টারনেট সংযোগ বিচ্ছিন্ন"
                      : status === "AUTH_EXPIRED"
                      ? "পুনরায় লগইন প্রয়োজন"
                      : "সার্ভারের সাথে সিঙ্ক হচ্ছে"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">ত্রুটি ঘটেছে:</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Queue Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                <p className="text-xs text-zinc-500">অপেক্ষমান এন্ট্রি</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {toBanglaDigits(pendingCount)}
                </p>
              </div>
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                <p className="text-xs text-zinc-500">ব্যর্থ এন্ট্রি</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {toBanglaDigits(failedCount)}
                </p>
              </div>
            </div>

            {/* Queue items list */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                অফলাইন অ্যাকশন কিউ ({toBanglaDigits(queue.length)})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {queue.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    সব ডাটা সার্ভারে সফলভাবে সিঙ্ক রয়েছে!
                  </div>
                ) : (
                  queue.map((item) => (
                    <div
                      key={item.clientId}
                      className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">
                          {item.actionType === "CREATE_SALE"
                            ? "বিক্রয় (New Sale)"
                            : item.actionType === "RECEIVE_PAYMENT"
                            ? "পেমেন্ট জমা (Payment)"
                            : "কাস্টমার তৈরি (Add Customer)"}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {new Date(item.createdAt).toLocaleTimeString("bn-BD")}
                        </p>
                        {item.errorMessage && (
                          <p className="text-[10px] text-rose-600 mt-0.5">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          item.status === "FAILED"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : item.status === "SYNCING"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {item.status === "FAILED"
                          ? "ব্যর্থ"
                          : item.status === "SYNCING"
                          ? "সিঙ্ক হচ্ছে"
                          : "অপেক্ষমান"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                onClick={handleManualSync}
                disabled={isManualSyncing || status === "OFFLINE"}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5 py-4"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isManualSyncing ? "animate-spin" : ""}`} />
                এখনই সিঙ্ক করুন
              </Button>

              {failedCount > 0 && (
                <Button
                  onClick={handleRetryFailed}
                  disabled={isManualSyncing || status === "OFFLINE"}
                  variant="outline"
                  className="rounded-xl text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5 py-4"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  পুনরায় চেষ্টা
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
