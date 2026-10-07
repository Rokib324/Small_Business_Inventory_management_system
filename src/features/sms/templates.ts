import { SmsVariables } from "./types";
import { SmsType } from "@prisma/client";

export const DEFAULT_SMS_TEMPLATES: Record<SmsType, { name: string; template: string }> = {
  DUE_REMINDER: {
    name: "বাকি তাগাদা (ডিফল্ট)",
    template:
      "প্রিয় {customer_name}, {shop_name}-এ আপনার বাকি {due_amount} টাকা। দ্রুত পরিশোধের অনুরোধ রইল। যোগাযোগ: {shop_phone}",
  },
  SALE_RECEIPT: {
    name: "বিক্রি রসিদ (ডিফল্ট)",
    template:
      "প্রিয় {customer_name}, {shop_name}-এ {invoice_no} চালানে মোট {total_amount} টাকা। পরিশোধ: {paid_amount} টাকা, বাকি: {due_amount} টাকা। {invoice_link}",
  },
  PAYMENT_RECEIPT: {
    name: "জমা রসিদ (ডিফল্ট)",
    template:
      "প্রিয় {customer_name}, {shop_name}-এ আপনার {paid_amount} টাকা জমা নেওয়া হয়েছে। বর্তমান বাকি: {due_amount} টাকা। ধন্যবাদ।",
  },
  CUSTOM: {
    name: "কাস্টম বার্তা",
    template: "প্রিয় {customer_name}, {shop_name} থেকে বার্তা: {message}",
  },
};

/**
 * Replace placeholders like {customer_name}, {due_amount}, {shop_name}
 */
export function renderSmsTemplate(template: string, vars: SmsVariables): string {
  let result = template;

  const replacements: Record<string, string> = {
    customer_name: vars.customer_name || "সম্মানিত গ্রাহক",
    shop_name: vars.shop_name || "আমাদের দোকান",
    shop_phone: vars.shop_phone || "",
    due_amount: vars.due_amount || "০",
    paid_amount: vars.paid_amount || "০",
    total_amount: vars.total_amount || "০",
    invoice_no: vars.invoice_no || "",
    invoice_link: vars.invoice_link ? `চালান: ${vars.invoice_link}` : "",
    date: vars.date || new Date().toLocaleDateString("bn-BD"),
  };

  for (const [key, val] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{${key}\\}`, "gi");
    result = result.replace(regex, val);
  }

  // Also replace any extra custom variable keys passed in vars
  for (const [key, val] of Object.entries(vars)) {
    if (val !== undefined && !(key in replacements)) {
      const regex = new RegExp(`\\{${key}\\}`, "gi");
      result = result.replace(regex, val);
    }
  }

  // Clean double spaces or dangling placeholders
  return result.replace(/\s+/g, " ").trim();
}
