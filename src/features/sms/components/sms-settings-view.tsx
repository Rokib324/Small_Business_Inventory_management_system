"use client";

import { useState } from "react";
import { SmsLog, SmsTemplate, SmsType, SmsStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoneyBn, toBanglaDigits } from "@/lib/money";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Save,
  HelpCircle,
  Radio,
} from "lucide-react";
import { upsertSmsTemplateAction } from "../actions";
import { DEFAULT_SMS_TEMPLATES, renderSmsTemplate } from "../templates";

interface SmsStats {
  dailyLimit: number;
  todaySent: number;
  remaining: number;
  totalCostPoisha: number;
}

interface SmsSettingsViewProps {
  stats: SmsStats;
  logs: (SmsLog & { customer: { name: string; phone: string | null } | null })[];
  templates: SmsTemplate[];
  providerName: string;
}

export function SmsSettingsView({
  stats,
  logs,
  templates,
  providerName,
}: SmsSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "templates" | "logs">("overview");

  // Template editor state
  const [selectedType, setSelectedType] = useState<SmsType>("DUE_REMINDER");
  const existingTemplate = templates.find((t) => t.smsType === selectedType);
  const defaultTemplate = DEFAULT_SMS_TEMPLATES[selectedType];

  const [templateText, setTemplateText] = useState(
    existingTemplate ? existingTemplate.template : defaultTemplate.template
  );
  const [templateName, setTemplateName] = useState(
    existingTemplate ? existingTemplate.name : defaultTemplate.name
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSelectType = (type: SmsType) => {
    setSelectedType(type);
    const tmpl = templates.find((t) => t.smsType === type);
    const def = DEFAULT_SMS_TEMPLATES[type];
    setTemplateText(tmpl ? tmpl.template : def.template);
    setTemplateName(tmpl ? tmpl.name : def.name);
    setFeedback(null);
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await upsertSmsTemplateAction({
        id: existingTemplate?.id,
        name: templateName,
        smsType: selectedType,
        template: templateText,
        isDefault: true,
      });
      setFeedback("টেমপ্লেট সফলভাবে সংরক্ষিত হয়েছে!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "সংরক্ষণ করা যায়নি";
      setFeedback(`ত্রুটি: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Preview message
  const previewMessage = renderSmsTemplate(templateText, {
    customer_name: "রহিম শেখ",
    shop_name: "মেসার্স ভাই ভাই হার্ডওয়্যার",
    shop_phone: "০১৭১১০০০০০০",
    due_amount: "৫০০.০০",
    paid_amount: "১,২০০.০০",
    total_amount: "১,৭০০.০০",
    invoice_no: "INV-2026-0001",
    invoice_link: "https://baki.app/invoice/share/sample_token",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500/10 border border-emerald-300 dark:border-emerald-900/50 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl md:text-2xl font-black text-emerald-950 dark:text-emerald-200">
              এসএমএস ও তাগাদা ব্যবস্থাপনা
            </h1>
          </div>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-400">
            বকেয়া তাগাদা, বিক্রির রসিদ এসএমএস ও টেমপ্লেট নিয়ন্ত্রণ করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            <span>গেটওয়ে: <strong className="text-emerald-700 dark:text-emerald-400">{providerName.toUpperCase()}</strong></span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 space-x-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition ${
            activeTab === "overview"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          ওভারভিউ ও কোটা
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition ${
            activeTab === "templates"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          বাংলা এসএমএস টেমপ্লেট
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition ${
            activeTab === "logs"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          এসএমএস হিস্টোরি (লগ)
        </button>
      </div>

      {/* Tab 1: Overview & Quota */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-zinc-500">
                  দৈনিক পাঠানোর সীমা
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {toBanglaDigits(stats.dailyLimit)} টি
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">দোকানের দৈনিক সর্বোচ্চ কোটা</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-zinc-500">
                  আজ পাঠানো হয়েছে
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-emerald-600">
                  {toBanglaDigits(stats.todaySent)} টি
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">সফল ও প্রক্রিয়াধীন এসএমএস</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-zinc-500">
                  আজকের বাকি কোটা
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-amber-600">
                  {toBanglaDigits(stats.remaining)} টি
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">আজ আর পাঠানো যাবে</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-zinc-500">
                  মোট আনুমানিক খরচ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatMoneyBn(stats.totalCostPoisha)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">সকল সফল এসএমএস বাবদ</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-bold">এসএমএস ফিচারসমূহ</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>বকেয়া তাগাদা:</strong> বাকি খাতা থেকে এক ক্লিকে যেকোনো একজন বা নির্দিষ্ট টাকার বেশি বাকি থাকা সবাইকে একসাথে স্বয়ংক্রিয় বাংলা তাগাদা পাঠানো যায়।
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>ডিজিটাল চালান রসিদ:</strong> বিক্রির পর গ্রাহকের মোবাইলে তাৎক্ষণিক এসএমএস এবং নিরাপদ মেয়াদযুক্ত অনলাইন চালান দেখার লিংক প্রেরণ।
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>কোটা ও অপব্যবহার রোধ:</strong> দৈনিক লিমিট এবং রেট-লিমিটিং প্রযুক্তির মাধ্যমে অতিরিক্ত খরচ ও অপব্যবহার সম্পূর্ণ সুরক্ষিত।
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Template Editor */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Template Selection Sidebar */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              টেমপ্লেট প্রকার
            </h3>
            <button
              onClick={() => handleSelectType("DUE_REMINDER")}
              className={`w-full text-left p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                selectedType === "DUE_REMINDER"
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
              }`}
            >
              বকেয়া তাগাদা (Due Reminder)
            </button>

            <button
              onClick={() => handleSelectType("SALE_RECEIPT")}
              className={`w-full text-left p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                selectedType === "SALE_RECEIPT"
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
              }`}
            >
              বিক্রি রসিদ (Sale Receipt)
            </button>

            <button
              onClick={() => handleSelectType("PAYMENT_RECEIPT")}
              className={`w-full text-left p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                selectedType === "PAYMENT_RECEIPT"
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
              }`}
            >
              জমা রসিদ (Payment Receipt)
            </button>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1 mt-4">
              <div className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" />
                উপলব্ধ ভেরিয়েবলসমূহ:
              </div>
              <p><code className="text-emerald-600">{"{customer_name}"}</code>: খদ্দেরের নাম</p>
              <p><code className="text-emerald-600">{"{due_amount}"}</code>: বকেয়া পরিমাণ</p>
              <p><code className="text-emerald-600">{"{paid_amount}"}</code>: জমা দেওয়া টাকা</p>
              <p><code className="text-emerald-600">{"{total_amount}"}</code>: চালানের মোট টাকা</p>
              <p><code className="text-emerald-600">{"{invoice_no}"}</code>: চালান নম্বর</p>
              <p><code className="text-emerald-600">{"{invoice_link}"}</code>: চালানের সুরক্ষিত লিংক</p>
              <p><code className="text-emerald-600">{"{shop_name}"}</code>: দোকানের নাম</p>
              <p><code className="text-emerald-600">{"{shop_phone}"}</code>: দোকানের ফোন নম্বর</p>
            </div>
          </div>

          {/* Template Edit Form */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  টেমপ্লেট সম্পাদনা
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    টেমপ্লেটের শিরোনাম:
                  </label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="টেমপ্লেটের নাম"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    বার্তা ফরম্যাট (ভেরিয়েবলসহ):
                  </label>
                  <textarea
                    rows={4}
                    value={templateText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-emerald-600"
                  />
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    গ্রাহক যেভাবে এসএমএসটি দেখতে পাবেন (প্রিভিউ):
                  </span>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {previewMessage}
                  </p>
                </div>

                {feedback && (
                  <div className="p-3 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200">
                    {feedback}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={isSaving}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "সংরক্ষণ হচ্ছে..." : "টেমপ্লেট সংরক্ষণ করুন"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 3: SMS History & Logs */}
      {activeTab === "logs" && (
        <Card className="overflow-hidden">
          <CardHeader className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              সম্প্রতি প্রেরিত এসএমএস তালিকা
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                এখনো কোনো এসএমএস পাঠানো হয়নি।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-semibold">
                      <th className="py-2.5 px-3">তারিখ ও সময়</th>
                      <th className="py-2.5 px-3">প্রাপক / মোবাইল</th>
                      <th className="py-2.5 px-3">ধরন</th>
                      <th className="py-2.5 px-3">বার্তা</th>
                      <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                      <th className="py-2.5 px-3 text-right">খরচ (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {logs.map((log) => {
                      const logDate = new Date(log.createdAt).toLocaleString("bn-BD", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const isSuccess = log.status === SmsStatus.SENT;

                      const typeLabels: Record<SmsType, string> = {
                        DUE_REMINDER: "বাকি তাগাদা",
                        SALE_RECEIPT: "বিক্রি রসিদ",
                        PAYMENT_RECEIPT: "জমা রসিদ",
                        CUSTOM: "অন্যান্য",
                      };

                      return (
                        <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                          <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                            {logDate}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {log.customer?.name || "খদ্দের"}
                            <div className="text-[11px] font-normal text-zinc-500">
                              {log.recipientPhone}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            {typeLabels[log.smsType] || log.smsType}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 max-w-xs truncate" title={log.message}>
                            {log.message}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> সফল
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 cursor-help"
                                title={log.error || "অজ্ঞাত সমস্যা"}
                              >
                                <XCircle className="h-3 w-3" /> ব্যর্থ
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                            {formatMoneyBn(log.costPoisha)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
