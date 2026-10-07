"use client";

import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, LogOut, User as UserIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import { Role } from "@prisma/client";

import { SyncStatusIndicator } from "@/components/offline/sync-status-indicator";

interface TopHeaderProps {
  shopName: string;
  userName: string;
  userRole: Role;
}

export function TopHeader({ shopName, userName, userRole }: TopHeaderProps) {
  const isOwner = userRole === "OWNER";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 md:px-6">
      {/* Shop Info */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {shopName}
            </h1>
            <Badge variant={isOwner ? "success" : "secondary"}>
              {isOwner ? "মালিক" : "স্টাফ"}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
            {t.common.tagline}
          </p>
        </div>
      </div>

      {/* User and actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Offline & Sync Status Indicator */}
        <SyncStatusIndicator />
        <div className="hidden sm:flex items-center gap-2 text-right">
          <div>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {userName}
            </p>
            <p className="text-[10px] text-zinc-500">
              {isOwner ? "দোকান স্বত্বাধিকারী" : "বিক্রয় প্রতিনিধি"}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <UserIcon className="h-4 w-4" />
          </div>
        </div>

        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">{t.nav.logout}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
