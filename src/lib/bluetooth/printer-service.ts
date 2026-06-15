// ---------------------------------------------------------------------------
// Web Bluetooth Printer Service
// Scan, connect, and send ESC/POS data to Bluetooth thermal printers.
//
// ⚠️  Web Bluetooth API hanya mendukung BLE (Bluetooth Low Energy) via GATT.
//     Printer thermal kebanyakan pakai Classic Bluetooth SPP/RFCOMM —
//     TIDAK bisa diakses via Web Bluetooth API.
//
//     Hanya printer dengan BLE GATT service yang didukung.
//     Fallback: gunakan window.print() untuk mencetak via dialog print sistem.
//
// Requirements:
//   - Chromium-based browser (Chrome/Edge) — Firefox/Safari NOT supported
//   - HTTPS (production Vercel)
// ---------------------------------------------------------------------------

export type ConnectionState = "idle" | "scanning" | "connecting" | "connected" | "printing" | "error";

export interface BluetoothPrinterInfo {
  name: string;
  id: string;
}

export interface PrintResult {
  success: boolean;
  error?: string;
  isClassicBluetooth?: boolean;
}

/** Known BLE printer GATT services (tried in order) */
const PRINTER_SERVICES = [
  "00001101-0000-1000-8000-00805f9b34fb", // Standard SPP over BLE
  "0000ff00-0000-1000-8000-00805f9b34fb", // Custom service (common)
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Nordic UART Service (NUS)
];

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private state: ConnectionState = "idle";

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  getState(): ConnectionState {
    return this.state;
  }

  async scan(): Promise<BluetoothPrinterInfo[]> {
    if (!this.isSupported()) {
      throw new Error("Bluetooth tidak didukung. Gunakan Chrome atau Edge.");
    }

    this.state = "scanning";

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES as BluetoothServiceUUID[],
      });

      this.state = "connecting";
      return [{ name: this.device.name || "Printer Tidak Dikenal", id: this.device.id }];
    } catch (err) {
      this.state = "error";
      const domErr = err as DOMException;
      if (domErr?.name === "NotFoundError") {
        throw new Error("Tidak ada perangkat Bluetooth ditemukan. Pastikan printer menyala dan dalam mode pairing.");
      }
      if (domErr?.message?.includes("cancelled") || domErr?.message?.includes("User cancelled")) {
        throw new Error("Pemindaian dibatalkan.");
      }
      throw err;
    }
  }

  async print(data: Uint8Array): Promise<PrintResult> {
    if (!this.device) {
      return { success: false, error: "Tidak ada printer yang dipilih." };
    }

    this.state = "printing";

    try {
      // Connect with timeout
      if (!this.device.gatt?.connected) {
        if (!this.device.gatt) {
          return {
            success: false,
            isClassicBluetooth: true,
            error: "Printer ini menggunakan Classic Bluetooth (SPP) dan tidak kompatibel dengan Web Bluetooth. Gunakan tombol [Cetak] untuk mencetak via dialog print sistem.",
          };
        }

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Koneksi timeout — printer tidak merespon.")), 8000)
        );
        this.server = await Promise.race([this.device.gatt.connect(), timeout]) as BluetoothRemoteGATTServer;
      }

      // Try each known printer service
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
      let lastError = "";

      for (const svcUuid of PRINTER_SERVICES) {
        try {
          const service = await this.server!.getPrimaryService(svcUuid);
          const chars = await service.getCharacteristics();

          for (const ch of chars) {
            // Look for writable characteristic
            if (ch.properties.write || ch.properties.writeWithoutResponse) {
              characteristic = ch;
              break;
            }
          }
          if (characteristic) break;
        } catch {
          lastError = `Service ${svcUuid.slice(0, 8)}... tidak ditemukan.`;
          continue;
        }
      }

      if (!characteristic) {
        return {
          success: false,
          isClassicBluetooth: true,
          error: "Printer tidak memiliki GATT service yang kompatibel. Kemungkinan printer menggunakan Classic Bluetooth. Gunakan tombol [Cetak] untuk mencetak via dialog print sistem.",
        };
      }

      // Send data in chunks
      const CHUNK_SIZE = 256;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(chunk);
        } else {
          await characteristic.writeValue(chunk);
        }
      }

      this.state = "connected";
      return { success: true };
    } catch (err) {
      this.state = "error";
      const msg = err instanceof Error ? err.message : "Gagal mencetak";

      // Detect classic Bluetooth (not BLE)
      if (msg.includes("GATT server is disconnected") ||
          msg.includes("Service not found") ||
          msg.includes("No Services")) {
        return {
          success: false,
          isClassicBluetooth: true,
          error: "Printer tidak kompatibel dengan Web Bluetooth (Classic Bluetooth/SPP). Gunakan tombol [Cetak] untuk mencetak via dialog print sistem.",
        };
      }

      return { success: false, error: msg };
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.state = "idle";
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();
