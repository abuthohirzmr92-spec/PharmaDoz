"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

const PLATFORM_INSTRUCTIONS = {
  ios: {
    title: "iPhone / iPad (Safari)",
    steps: 'Klik <strong>Bagikan</strong> <code class="rounded bg-neutral-200 px-1 dark:bg-neutral-700">↗</code> lalu pilih <strong>Add to Home Screen</strong>',
  },
  android: {
    title: "Android (Chrome / Edge)",
    steps: 'Klik menu <code class="rounded bg-neutral-200 px-1 dark:bg-neutral-700">⋮</code> lalu pilih <strong>Install App</strong> atau <strong>Add to Home Screen</strong>',
  },
  desktop: {
    title: "Desktop (Chrome / Edge)",
    steps: 'Klik ikon <strong>Install</strong> <code class="rounded bg-neutral-200 px-1 dark:bg-neutral-700">⊕</code> di address bar',
  },
};

/**
 * PWA Install Button — Login Page
 *
 * Android/Desktop (Chrome/Edge): captures beforeinstallprompt → native dialog
 * iOS (Safari): shows platform-specific "Add to Home Screen" guidance
 * Other browsers: shows platform-specific fallback instructions
 */
export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [installed, setInstalled] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // iOS never fires beforeinstallprompt — we'll handle in button click
    if (platform === "ios") return;

    // Capture beforeinstallprompt (Chrome/Edge on Android and Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect successful install
    const installedHandler = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [platform]);

  const handleInstall = async () => {
    // iOS: always show guidance (no beforeinstallprompt support)
    if (platform === "ios") {
      setShowFallback(true);
      return;
    }

    // Android/Desktop: use native prompt if available
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
      return;
    }

    // No native prompt available — show fallback
    setShowFallback(true);
  };

  // Already installed — nothing to show
  if (installed) return null;

  const instr = PLATFORM_INSTRUCTIONS[platform] ?? PLATFORM_INSTRUCTIONS.desktop!;

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Download className="h-4 w-4" />
        Install Aplikasi
      </button>

      {/* Fallback modal — platform-specific instructions */}
      {showFallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFallback(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-brand-600" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Install Aplikasi
                </h3>
              </div>
              <button onClick={() => setShowFallback(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
              <p>Aplikasi dapat diinstal melalui menu browser Anda:</p>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
                <p className="font-medium text-neutral-900 dark:text-neutral-50">{instr.title}</p>
                <p className="mt-1 text-xs" dangerouslySetInnerHTML={{ __html: instr.steps }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
