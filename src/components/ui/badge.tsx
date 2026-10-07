import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-emerald-600 text-white",
    secondary: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
    destructive: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900",
    outline: "border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200",
    success: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    warning: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors",
          variantStyles[variant],
          className
        )
      )}
      {...props}
    />
  );
}
