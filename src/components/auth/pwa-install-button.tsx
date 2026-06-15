"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA Install Button — Login Page
 *
 * Shows "Install Aplikasi" when the browser supports PWA installation.
 * Falls back to instructions modal if beforeinstallprompt is unavailable.
 */
export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Capture beforeinstallprompt
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
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowFallback(true);
      return;
    }

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setInstalled(true);
    }
    setInstallPrompt(null);
  };

  // Already installed — nothing to show
  if (installed) return null;

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

      {/* Fallback modal — browser doesn't support PWA install prompt */}
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
                <p className="font-medium text-neutral-900 dark:text-neutral-50">Android (Chrome / Edge)</p>
                <p className="mt-1 text-xs">Klik menu <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">⋮</code> lalu pilih <strong>Install App</strong> atau <strong>Add to Home Screen</strong></p>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
                <p className="font-medium text-neutral-900 dark:text-neutral-50">iPhone / iPad (Safari)</p>
                <p className="mt-1 text-xs">Klik <strong>Bagikan</strong> <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">↗</code> lalu pilih <strong>Add to Home Screen</strong></p>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
                <p className="font-medium text-neutral-900 dark:text-neutral-50">Desktop (Chrome / Edge)</p>
                <p className="mt-1 text-xs">Klik ikon <strong>Install</strong> <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">⊕</code> di address bar</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
