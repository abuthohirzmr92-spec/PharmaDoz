"use client";

import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Search } from "lucide-react";

type InputVariant = "text" | "search";

interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
}

export function AppInput({ variant = "text", className, ...props }: AppInputProps) {
  if (variant === "search") {
    return (
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-neutral-400" />
        <input
          type="text"
          className={cn(
            "w-full bg-white pl-12 pr-4 text-sm text-neutral-800 placeholder-neutral-400 outline-none rounded-full border-0 shadow-sm dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500",
            className,
          )}
          style={{ height: "56px" }}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      className={cn(
        "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-[#1E88E5] focus:ring-1 focus:ring-[#1E88E5] dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-500",
        className,
      )}
      {...props}
    />
  );
}
