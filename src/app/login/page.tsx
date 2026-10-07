"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, UserCheck, ShieldCheck } from "lucide-react";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("ভুল মোবাইল নম্বর/ইমেইল অথবা পাসওয়ার্ড। আবার চেষ্টা করুন।");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("লগইন করতে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
      setLoading(false);
    }
  };

  const fillCredentials = (phone: string, pass: string) => {
    setIdentifier(phone);
    setPassword(pass);
    setError(null);
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
            {t.common.tagline}
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">
              {t.auth.loginTitle}
            </CardTitle>
            <CardDescription className="text-center text-xs">
              আপনার সংরক্ষিত মোবাইল নম্বর এবং পাসওয়ার্ড দিন
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t.auth.phoneOrEmail}
                </label>
                <Input
                  type="text"
                  placeholder="01XXXXXXXXX"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t.auth.password}
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full text-base font-semibold"
                isLoading={loading}
              >
                {t.auth.loginButton}
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 mb-2.5 text-center">
                দ্রুত টেস্ট করতে ডেমো অ্যাকাউন্টে ক্লিক করুন:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials("01711000000", "password123")}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs font-medium transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  মালিক (Owner)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("01711000001", "password123")}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300 text-xs font-medium transition cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  স্টাফ (Staff)
                </button>
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t.auth.noAccount}{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-emerald-600 hover:underline"
                >
                  {t.auth.signupButton}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
