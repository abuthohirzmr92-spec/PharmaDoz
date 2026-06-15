// ---------------------------------------------------------------------------
// Web Bluetooth Printer Service
// Scan, connect, and send ESC/POS data to Bluetooth thermal printers.
//
// Requirements:
//   - Chromium-based browser (Chrome/Edge) — Firefox/Safari NOT supported
//   - HTTPS (production Vercel)
//   - Printer must support ESC/POS over Bluetooth Serial (SPP)
// ---------------------------------------------------------------------------

export type ConnectionState = "idle" | "scanning" | "connecting" | "connected" | "printing" | "error";

export interface BluetoothPrinterInfo {
  name: string;
  id: string;
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private state: ConnectionState = "idle";

  /** Check if Web Bluetooth API is available */
  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      "bluetooth" in navigator
    );
  }

  getState(): ConnectionState {
    return this.state;
  }

  /** Scan for nearby Bluetooth devices (printers) */
  async scan(): Promise<BluetoothPrinterInfo[]> {
    if (!this.isSupported()) {
      throw new Error("Bluetooth tidak didukung di browser ini. Gunakan Chrome atau Edge.");
    }

    this.state = "scanning";

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["00001101-0000-1000-8000-00805f9b34fb"], // SPP UUID
      });

      this.state = "connecting";
      return [{ name: this.device.name || "Printer Tidak Dikenal", id: this.device.id }];
    } catch (err) {
      this.state = "error";
      if ((err as DOMException)?.name === "NotFoundError") {
        throw new Error("Tidak ada perangkat Bluetooth ditemukan.");
      }
      throw err;
    }
  }

  /** Connect and send ESC/POS data to the printer */
  async print(data: Uint8Array): Promise<PrintResult> {
    if (!this.device) {
      return { success: false, error: "Tidak ada printer yang dipilih. Scan dulu." };
    }

    this.state = "printing";

    try {
      if (!this.device.gatt?.connected) {
        if (!this.device.gatt) throw new Error("Printer tidak mendukung GATT.");
        this.server = await this.device.gatt.connect();
      }

      // Get the SPP service (Serial Port Profile)
      const SPP_SERVICE = "00001101-0000-1000-8000-00805f9b34fb";
      const service = await this.server!.getPrimaryService(SPP_SERVICE);

      // Get the characteristic for sending data
      const characteristic = await service.getCharacteristic(
        "00001101-0000-1000-8000-00805f9b34fb"
      );

      // Send data in chunks (BLE has MTU limits, typically 512 bytes)
      const CHUNK_SIZE = 512;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristic.writeValueWithoutResponse(chunk);
      }

      this.state = "connected";
      return { success: true };
    } catch (err) {
      this.state = "error";
      const msg = err instanceof Error ? err.message : "Gagal mencetak";
      return { success: false, error: msg };
    }
  }

  /** Disconnect from the printer */
  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.state = "idle";
  }
}

/** Singleton instance */
export const bluetoothPrinter = new BluetoothPrinterService();
