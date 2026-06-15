// ---------------------------------------------------------------------------
// ESC/POS Encoder — Thermal Receipt Printer Commands
// Pure TypeScript, zero dependencies. Generates byte arrays for common
// ESC/POS thermal printer operations.
// ---------------------------------------------------------------------------

const ESC = 0x1b;
const GS = 0x1d;

export type TextAlignment = "left" | "center" | "right";
export type BarcodeType = "UPCA" | "UPCE" | "EAN13" | "EAN8" | "CODE39" | "CODE128";

function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Concatenate multiple Uint8Array into one */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

/** ESC/POS command: initialize printer */
export function cmdInit(): Uint8Array {
  return new Uint8Array([ESC, 0x40]); // ESC @
}

/** ESC/POS command: text alignment (0=left, 1=center, 2=right) */
export function cmdAlign(alignment: TextAlignment): Uint8Array {
  const map: Record<TextAlignment, number> = { left: 0, center: 1, right: 2 };
  return new Uint8Array([ESC, 0x61, map[alignment]]);
}

/** ESC/POS command: bold on/off */
export function cmdBold(on: boolean): Uint8Array {
  return new Uint8Array([ESC, 0x45, on ? 1 : 0]);
}

/** ESC/POS command: double width/height text */
export function cmdTextSize(width: 1 | 2, height: 1 | 2): Uint8Array {
  const w = width - 1;
  const h = height - 1;
  return new Uint8Array([GS, 0x21, (h << 4) | w]);
}

/** ESC/POS command: underline on/off */
export function cmdUnderline(on: boolean): Uint8Array {
  return new Uint8Array([ESC, 0x2d, on ? 1 : 0]);
}

/** ESC/POS command: line feed */
export function cmdFeed(lines: number = 1): Uint8Array {
  return new Uint8Array(Array(lines).fill(0x0a)); // LF × n
}

/** ESC/POS command: cut paper (0=full, 1=partial) */
export function cmdCut(mode: "full" | "partial" = "partial"): Uint8Array {
  const m = mode === "full" ? 0x41 : 0x42;
  return new Uint8Array([GS, 0x56, m, 0]);
}

/** ESC/POS command: drawer kick */
export function cmdDrawer(): Uint8Array {
  return new Uint8Array([ESC, 0x70, 0, 25, 250]);
}

/** ESC/POS command: barcode */
export function cmdBarcode(data: string, type: BarcodeType = "CODE128"): Uint8Array {
  const typeMap: Record<BarcodeType, number> = {
    UPCA: 65, UPCE: 66, EAN13: 67, EAN8: 68, CODE39: 69, CODE128: 73,
  };
  return concat(
    new Uint8Array([GS, 0x68, 80]),         // barcode height
    new Uint8Array([GS, 0x77, 2]),          // barcode width
    new Uint8Array([GS, 0x48, 2]),          // HRI position (below)
    new Uint8Array([GS, 0x6b, typeMap[type], ...encode(data), 0x00]),
  );
}

// ---------------------------------------------------------------------------
// Receipt Builder — fluent API for building a complete receipt
// ---------------------------------------------------------------------------

interface ReceiptLine {
  text: string;
  align?: TextAlignment;
  bold?: boolean;
  doubleHeight?: boolean;
}

export class ReceiptBuilder {
  private lines: ReceiptLine[] = [];
  private storeName: string = "";
  private storeAddress: string = "";
  private storePhone: string = "";
  private invoiceNum: string = "";
  private date: string = "";
  private cashier: string = "";
  private items: { name: string; qty: number; price: number; subtotal: number }[] = [];
  private total: number = 0;
  private paymentMethod: string = "";
  private footer: string = "";

  setStore(name: string, address?: string, phone?: string): this {
    this.storeName = name;
    if (address) this.storeAddress = address;
    if (phone) this.storePhone = phone;
    return this;
  }

  setInvoice(number: string, date: string, cashier?: string): this {
    this.invoiceNum = number;
    this.date = date;
    if (cashier) this.cashier = cashier;
    return this;
  }

  addItem(name: string, qty: number, price: number, subtotal: number): this {
    this.items.push({ name, qty, price, subtotal });
    return this;
  }

  setTotal(total: number): this {
    this.total = total;
    return this;
  }

  setPayment(method: string): this {
    this.paymentMethod = method;
    return this;
  }

  setFooter(text: string): this {
    this.footer = text;
    return this;
  }

  /** Build the complete ESC/POS byte command sequence */
  build(): Uint8Array {
    const buf: Uint8Array[] = [];

    buf.push(cmdInit());

    // Header — store name
    buf.push(cmdAlign("center"));
    buf.push(cmdBold(true));
    buf.push(cmdTextSize(1, 2)); // double height
    buf.push(this.line(this.storeName || "Apotek"));
    buf.push(cmdTextSize(1, 1));
    buf.push(cmdBold(false));

    if (this.storeAddress) buf.push(this.line(this.storeAddress));
    if (this.storePhone) buf.push(this.line(this.storePhone));

    buf.push(this.separator());

    // Invoice info
    buf.push(cmdAlign("left"));
    buf.push(this.line(`No: ${this.invoiceNum}`));
    buf.push(this.line(`Tgl: ${this.date}`));
    if (this.cashier) buf.push(this.line(`Kasir: ${this.cashier}`));

    buf.push(this.separator());

    // Column header
    buf.push(this.line("Nama         Qty  Harga   Subtotal"));
    buf.push(this.separator("-"));

    // Items
    for (const item of this.items) {
      const name = item.name.length > 13 ? item.name.slice(0, 12) + "." : item.name.padEnd(13);
      const qty = String(item.qty).padStart(3);
      const price = this.fmtNum(item.price).padStart(7);
      const subtotal = this.fmtNum(item.subtotal).padStart(9);
      buf.push(this.line(`${name} ${qty} ${price} ${subtotal}`));
    }

    buf.push(this.separator());

    // Total
    buf.push(cmdAlign("right"));
    buf.push(cmdBold(true));
    buf.push(this.line(`TOTAL: Rp ${this.fmtNum(this.total)}`));
    buf.push(cmdBold(false));

    // Payment
    buf.push(cmdAlign("left"));
    buf.push(this.line(`Pembayaran: ${this.paymentMethod}`));

    // Footer
    if (this.footer) {
      buf.push(this.separator());
      buf.push(cmdAlign("center"));
      buf.push(this.line(this.footer));
    }

    // End
    buf.push(cmdFeed(3));
    buf.push(cmdCut("partial"));

    return concat(...buf);
  }

  private line(text: string): Uint8Array {
    return concat(encode(text), cmdFeed(1));
  }

  private separator(char: string = "-"): Uint8Array {
    return concat(encode(char.repeat(32)), cmdFeed(1));
  }

  private fmtNum(n: number): string {
    return n.toLocaleString("id-ID");
  }
}
