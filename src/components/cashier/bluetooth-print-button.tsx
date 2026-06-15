"use client";

import { useState } from "react";
import { Bluetooth, Printer, Loader2, AlertTriangle } from "lucide-react";
import { bluetoothPrinter } from "@/lib/bluetooth/printer-service";
import { toast } from "sonner";

interface Props {
  /** ESC/POS byte data to send to the printer */
  printData: Uint8Array | null;
  /** Called after a successful Bluetooth print */
  onPrinted?: () => void;
  disabled?: boolean;
}

export function BluetoothPrintButton({ printData, onPrinted, disabled }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const isSupported = bluetoothPrinter.isSupported();

  const handleBluetoothPrint = async () => {
    if (!printData) {
      toast.error("Data struk belum siap.");
      return;
    }

    setIsBusy(true);
    try {
      // Step 1: Scan & select printer
      await bluetoothPrinter.scan();

      // Step 2: Send print data
      const result = await bluetoothPrinter.print(printData);

      if (result.success) {
        toast.success("Struk berhasil dicetak via Bluetooth.");
        await bluetoothPrinter.disconnect();
        onPrinted?.();
      } else {
        // Classic Bluetooth SPP printer detected — show fallback guidance
        if (result.isClassicBluetooth) {
          toast.error(result.error, {
            duration: 6000,
            description: "Gunakan tombol [Cetak] untuk mencetak via dialog sistem.",
          });
        } else {
          toast.error(result.error || "Gagal mencetak.");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mencetak via Bluetooth";
      // User cancelled device selection — don't show error
      if (msg.includes("cancelled") || msg.includes("User cancelled")) return;
      toast.error(msg);
    } finally {
      setIsBusy(false);
    }
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        onClick={() => setShowFallback(true)}
        disabled={disabled}
        className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
      >
        <Bluetooth className="h-3 w-3" />
        Bluetooth
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleBluetoothPrint}
        disabled={disabled || isBusy}
        className="flex items-center gap-1 rounded border border-brand-200 bg-brand-50 px-2 py-1.5 text-[10px] font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
      >
        {isBusy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Bluetooth className="h-3 w-3" />
        )}
        {isBusy ? "Mencari..." : "Bluetooth"}
      </button>

      {/* Fallback modal — unsupported browser */}
      {showFallback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowFallback(false)} />
          <div className="relative w-full max-w-xs rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  Bluetooth Tidak Didukung
                </h4>
                <p className="mt-1 text-xs text-neutral-500">
                  Browser ini tidak mendukung Web Bluetooth. Gunakan <strong>Chrome</strong> atau <strong>Edge</strong> untuk mencetak via Bluetooth.
                </p>
                <p className="mt-2 text-xs text-neutral-400">
                  Alternatif: klik <Printer className="inline h-3 w-3" /> <strong>Cetak</strong> untuk mencetak via dialog print sistem.
                </p>
                <button
                  onClick={() => setShowFallback(false)}
                  className="mt-3 w-full rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
