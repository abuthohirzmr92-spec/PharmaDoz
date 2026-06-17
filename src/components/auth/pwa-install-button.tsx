"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Smartphone, X, Share2, PlusSquare } from "lucide-react";
import { toast } from "sonner";
import { usePlatformBrandingStore } from "@/store/platform-branding-store";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/* ------------------------------------------------------------------ */
/*  Platform detection                                                  */
/* ------------------------------------------------------------------ */

type Platform = "ios" | "android" | "desktop";

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true // iOS standalone
  );
}

/* ------------------------------------------------------------------ */
/*  Smart Install Button                                               */
/* ------------------------------------------------------------------ */

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [promptAvailable, setPromptAvailable] = useState(false);

  const branding = usePlatformBrandingStore();
  const appName = branding.getAppName();
  const platform = getPlatform();

  // ---- Detect install state ----
  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // iOS: never fires beforeinstallprompt
    if (platform === "ios") return;

    // Capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setPromptAvailable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Detect successful install
    const installedHandler = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setPromptAvailable(false);
      toast.success(`${appName} berhasil diinstal!`);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [platform, appName]);

  // ---- Handle button click ----
  const handleClick = useCallback(async () => {
    // iOS: show Add to Home Screen guide
    if (platform === "ios") {
      setShowGuide(true);
      return;
    }

    // Native prompt available — use it immediately
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
      setPromptAvailable(false);
      return;
    }

    // beforeinstallprompt may not have fired yet — wait briefly for it
    // Chrome sometimes fires the event with a delay on first visit
    const waited = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 2000);

      const captureOnce = (e: Event) => {
        e.preventDefault();
        window.removeEventListener("beforeinstallprompt", captureOnce);
        if (!resolved) { resolved = true; clearTimeout(timeout); resolve(e as BeforeInstallPromptEvent); }
      };
      window.addEventListener("beforeinstallprompt", captureOnce);
    });

    if (waited) {
      waited.prompt();
      const { outcome } = await waited.userChoice;
      if (outcome === "accepted") setInstalled(true);
      return;
    }

    // Still no native prompt — fallback to platform-specific guide
    setShowGuide(true);
  }, [platform, installPrompt]);

  // ---- Button label ----
  const buttonLabel = installed
    ? "Sudah Terpasang"
    : platform === "ios"
      ? `Cara Install ${appName}`
      : `Install ${appName}`;

  // ---- Don't show if installed ----
  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={installed}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Download className="h-4 w-4" />
        {buttonLabel}
      </button>

      {/* ─── iOS Guide ─── */}
      {showGuide && platform === "ios" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-brand-600" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Install {appName} di iPhone
                </h3>
              </div>
              <button onClick={() => setShowGuide(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">1</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Tekan tombol Share</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                    <Share2 className="h-4 w-4 text-blue-500" />
                    <span>Ikon <strong>Share</strong> di bagian bawah browser Safari</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">2</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Pilih Add to Home Screen</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                    <PlusSquare className="h-4 w-4 text-blue-500" />
                    <span>Scroll ke bawah dan pilih <strong>Add to Home Screen</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">3</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Tekan Add</p>
                  <p className="mt-1 text-xs text-neutral-500">Konfirmasi dengan menekan <strong>Add</strong> di pojok kanan atas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Android Guide ─── */}
      {showGuide && platform === "android" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-brand-600" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Install {appName} di Android
                </h3>
              </div>
              <button onClick={() => setShowGuide(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">1</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Tekan menu ⋮</p>
                  <p className="mt-1 text-xs text-neutral-500">Buka menu tiga titik di pojok kanan atas browser Chrome</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">2</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Pilih Install App</p>
                  <p className="mt-1 text-xs text-neutral-500">Pilih <strong>Install App</strong> atau <strong>Add to Home Screen</strong></p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">3</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Konfirmasi pemasangan</p>
                  <p className="mt-1 text-xs text-neutral-500">Tekan <strong>Install</strong> pada dialog yang muncul</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Desktop Guide ─── */}
      {showGuide && platform === "desktop" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-brand-600" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  Install {appName} di Desktop
                </h3>
              </div>
              <button onClick={() => setShowGuide(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">1</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Cari ikon Install</p>
                  <p className="mt-1 text-xs text-neutral-500">Lihat ikon <strong>⊕ Install</strong> di address bar browser Chrome/Edge</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">2</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Klik Install</p>
                  <p className="mt-1 text-xs text-neutral-500">Klik ikon tersebut untuk membuka dialog pemasangan</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400 font-bold text-sm">3</div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Konfirmasi pemasangan</p>
                  <p className="mt-1 text-xs text-neutral-500">Tekan <strong>Install</strong> pada dialog konfirmasi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
