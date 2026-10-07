import { z } from "zod";

export const customerSchema = z.object({
  name: z
    .string()
    .min(2, "কাস্টমারের নাম কমপক্ষে ২ অক্ষরের হতে হবে")
    .max(100, "কাস্টমারের নাম ১০০ অক্ষরের মধ্যে হতে হবে"),
  phone: z
    .string()
    .max(15, "সঠিক মোবাইল নম্বর দিন")
    .optional()
    .or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  // Opening due in Taka from UI input (converted to poisha on server)
  openingDueTaka: z
    .number({ message: "প্রারম্ভিক বাকি সঠিক সংখ্যা হতে হবে" })
    .min(0, "প্রারম্ভিক বাকি ঋণাত্মক হতে পারে না")
    .default(0),
});

export type CustomerFormInput = z.infer<typeof customerSchema>;

export const editCustomerSchema = z.object({
  id: z.string().min(1, "কাস্টমার আইডি আবশ্যক"),
  name: z
    .string()
    .min(2, "কাস্টমারের নাম কমপক্ষে ২ অক্ষরের হতে হবে")
    .max(100, "কাস্টমারের নাম ১০০ অক্ষরের মধ্যে হতে হবে"),
  phone: z
    .string()
    .max(15, "সঠিক মোবাইল নম্বর দিন")
    .optional()
    .or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
});

export type EditCustomerInput = z.infer<typeof editCustomerSchema>;
