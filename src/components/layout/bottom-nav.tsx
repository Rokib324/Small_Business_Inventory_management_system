"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  BookOpen,
  Users,
  Package,
} from "lucide-react";
import { clsx } from "clsx";

const mobileItems = [
  {
    href: "/",
    label: "হোম",
    icon: LayoutDashboard,
  },
  {
    href: "/sales/new",
    label: "বিক্রি",
    icon: ShoppingCart,
    highlight: true,
  },
  {
    href: "/due-list",
    label: "বাকি",
    icon: BookOpen,
  },
  {
    href: "/products",
    label: "পণ্য",
    icon: Package,
  },
  {
    href: "/customers",
    label: "খাতা",
    icon: Users,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2 flex items-center justify-around shadow-lg">
      {mobileItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        const Icon = item.icon;

        if (item.highlight) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center -mt-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 active:scale-95 transition-transform">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors",
              isActive
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
