export const buttonVariants = {
  primary: "bg-gradient-to-r from-[#12D6B5] to-[#1E88E5] text-white shadow-md",
  secondary: "bg-white border border-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300",
  ghost: "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
  danger: "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400",
} as const;

export const buttonSizes = {
  sm: "px-3 py-1.5 text-xs rounded-xl",
  md: "px-4 py-2.5 text-sm rounded-2xl",
  lg: "px-6 py-3 text-base rounded-2xl",
} as const;
