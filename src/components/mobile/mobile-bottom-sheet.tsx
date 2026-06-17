"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: string;
}

export function MobileBottomSheet({ open, onClose, title, children, height = "70vh" }: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 inset-x-0 bg-white dark:bg-[#1E293B] overflow-hidden"
        style={{
          borderRadius: "32px 32px 0 0",
          height,
          animation: "slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-neutral-200 dark:bg-neutral-600" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3">
            <h3 className="text-base font-bold text-neutral-800 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-full bg-neutral-100 p-2 transition active:scale-95 dark:bg-neutral-700"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto px-5" style={{ height: `calc(${height} - ${title ? "60px" : "20px"})` }}>
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
