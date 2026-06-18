import type { InputHTMLAttributes } from "react";

export type InputVariant = "text" | "search";

export interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
}
