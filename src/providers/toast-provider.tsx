"use client";

import { Toaster } from "sonner";
import { TOAST_DURATION } from "@/config/constants";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      duration={TOAST_DURATION}
      richColors
      closeButton
    />
  );
}
