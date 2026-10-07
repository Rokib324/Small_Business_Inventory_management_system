import { z } from "zod";

export const supplierSchema = z.object({
  name: z
    .string()
    .min(2, "মহাজনের নাম কমপক্ষে ২ অক্ষরের হতে হবে")
    .max(100, "মহাজনের নাম ১০০ অক্ষরের মধ্যে হতে হবে"),
  companyName: z.string().max(100).optional().or(z.literal("")),
  phone: z
    .string()
    .max(15, "সঠিক মোবাইল নম্বর দিন")
    .optional()
    .or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  // Opening payable in Taka (what the shop owes the supplier)
  openingPayableTaka: z
    .number({ message: "প্রারম্ভিক দেনা সঠিক সংখ্যা হতে হবে" })
    .min(0, "প্রারম্ভিক দেনা ঋণাত্মক হতে পারে না")
    .default(0),
});

export type SupplierFormInput = z.infer<typeof supplierSchema>;

export const editSupplierSchema = z.object({
  id: z.string().min(1, "সাপ্লায়ার আইডি আবশ্যক"),
  name: z
    .string()
    .min(2, "মহাজনের নাম কমপক্ষে ২ অক্ষরের হতে হবে")
    .max(100, "মহাজনের নাম ১০০ অক্ষরের মধ্যে হতে হবে"),
  companyName: z.string().max(100).optional().or(z.literal("")),
  phone: z
    .string()
    .max(15, "সঠিক মোবাইল নম্বর দিন")
    .optional()
    .or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
});

export type EditSupplierInput = z.infer<typeof editSupplierSchema>;
