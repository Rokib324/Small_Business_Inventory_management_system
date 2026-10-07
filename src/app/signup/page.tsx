"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store } from "lucide-react";
import { registerShopAndOwnerAction } from "@/features/auth/actions";
import { t } from "@/lib/i18n";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
    address: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[e.target.name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setLoading(true);

    try {
      const res = await registerShopAndOwnerAction(formData);

      if (!res.success) {
        setGeneralError(res.message || "নিবন্ধন সম্পন্ন হতে পারেনি");
        if (res.errors) {
          setErrors(res.errors);
        }
        setLoading(false);
        return;
      }

      // Auto login on successful registration
      const loginRes = await signIn("credentials", {
        identifier: formData.phone,
        password: formData.password,
        redirect: false,
      });

      if (loginRes?.error) {
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setGeneralError("একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। আবার চেষ্টা করুন।");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.common.appName}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t.auth.signupTitle}
          </p>
        </div>

        {/* Signup Card */}
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">
              দোকানের তথ্য প্রদান করুন
            </CardTitle>
            <CardDescription className="text-center text-xs">
              মাত্র ১ মিনিটে শুরু করুন আপনার ডিজিটাল খাতা
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t.auth.shopName} *
                </label>
                <Input
                  name="shopName"
                  placeholder="যেমন: মেসার্স রহিম হার্ডওয়্যার"
                  value={formData.shopName}
                  onChange={handleChange}
                  error={errors.shopName?.[0]}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t.auth.ownerName} *
                </label>
                <Input
                  name="ownerName"
                  placeholder="যেমন: মো: আব্দুর রহিম"
                  value={formData.ownerName}
                  onChange={handleChange}
                  error={errors.ownerName?.[0]}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t.common.phone} *
                </label>
                <Input
                  name="phone"
                  placeholder="017XXXXXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                  error={errors.phone?.[0]}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t.common.address} (ঐচ্ছিক)
                </label>
                <Input
                  name="address"
                  placeholder="যেমন: বাজার রোড, ঢাকা"
                  value={formData.address}
                  onChange={handleChange}
                  error={errors.address?.[0]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t.auth.password} (কমপক্ষে ৬ অক্ষর) *
                </label>
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password?.[0]}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full text-base font-semibold mt-2"
                isLoading={loading}
              >
                {t.auth.signupButton}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t.auth.hasAccount}{" "}
                <Link
                  href="/login"
                  className="font-semibold text-emerald-600 hover:underline"
                >
                  {t.auth.loginButton}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
