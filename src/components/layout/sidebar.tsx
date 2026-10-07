"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Users,
  BookOpen,
  Package,
  HandCoins,
  Truck,
  Building2,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { clsx } from "clsx";

const navItems = [
  {
    href: "/",
    label: t.nav.dashboard,
    icon: LayoutDashboard,
  },
  {
    href: "/sales/new",
    label: t.nav.billing,
    icon: ShoppingCart,
    highlight: true,
  },
  {
    href: "/sales",
    label: t.nav.sales,
    icon: Receipt,
  },
  {
    href: "/purchases",
    label: t.nav.purchases,
    icon: Truck,
  },
  {
    href: "/due-list",
    label: t.nav.dueList,
    icon: BookOpen,
  },
  {
    href: "/customers",
    label: t.nav.customers,
    icon: Users,
  },
  {
    href: "/suppliers",
    label: t.nav.suppliers,
    icon: Building2,
  },
  {
    href: "/products",
    label: t.nav.products,
    icon: Package,
  },
  {
    href: "/payments",
    label: t.nav.payments,
    icon: HandCoins,
  },
  {
    href: "/reports",
    label: t.nav.reports,
    icon: BarChart3,
  },
  {
    href: "/settings/sms",
    label: t.nav.smsSettings,
    icon: MessageSquare,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[calc(100vh-4rem)] p-4 space-y-6">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          প্রধান মেনু
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? item.highlight
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold"
                      : "bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : item.highlight
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <Icon
                  className={clsx(
                    "h-5 w-5",
                    isActive
                      ? item.highlight
                        ? "text-white"
                        : "text-emerald-600 dark:text-emerald-400"
                      : item.highlight
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {t.common.appName} v1.0
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            অফলাইন ও বাংলা-ফার্স্ট খাতা
          </p>
        </div>
      </div>
    </aside>
  );
}
