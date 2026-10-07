import { z } from "zod";

export const signupSchema = z.object({
  shopName: z
    .string()
    .min(2, "দোকানের নাম কমপক্ষে ২ অক্ষরের হতে হবে")
    .max(100, "দোকানের নাম ১০০ অক্ষরের মধ্যে হতে হবে"),
  ownerName: z
    .string()
    .min(2, "মালিকের নাম কমপক্ষে ২ অক্ষরের হতে হবে")
    .max(80, "মালিকের নাম ৮০ অক্ষরের মধ্যে হতে হবে"),
  phone: z
    .string()
    .min(11, "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)")
    .max(15, "সঠিক মোবাইল নম্বর দিন")
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, "সঠিক বাংলাদেশী মোবাইল নম্বর দিন"),
  email: z
    .string()
    .email("সঠিক ইমেইল ঠিকানা দিন")
    .optional()
    .or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  password: z
    .string()
    .min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে")
    .max(100),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginFormSchema = z.object({
  identifier: z.string().min(1, "মোবাইল নম্বর অথবা ইমেইল দিন"),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
});

export type LoginFormInput = z.infer<typeof loginFormSchema>;
