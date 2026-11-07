// Client-safe shop helpers shared by the storefront, checkout and admin.
import type { Product } from "./catalog";

export type ShopSettings = {
  contact: string;
  instagram: string;
  bankBin: string;
  bankAccount: string;
  bankHolder: string;
  shippingFee: number;
  freeShipOver: number;
  expressFee: number;
};

export const emptySettings: ShopSettings = { contact: "", instagram: "", bankBin: "", bankAccount: "", bankHolder: "", shippingFee: 0, freeShipOver: 0, expressFee: 0 };

/** Items whose stock is not confirmed yet can still be ordered, up to this many each. */
export const PENDING_STOCK_LIMIT = 10;

export const canOrder = (p: Pick<Product, "pricePending" | "stockPending" | "stock" | "price">) =>
  !p.pricePending && p.price > 0 && (p.stockPending ? true : p.stock > 0);

export const maxOrderQty = (p: Pick<Product, "stockPending" | "stock">) =>
  Math.min(99, p.stockPending ? PENDING_STOCK_LIMIT : p.stock);

export type ShippingMethod = "standard" | "express";
export type ShippingMode = "fixed" | "free" | "phone";
export const SHIPPING_LABEL: Record<ShippingMethod, string> = { standard: "Giao tiêu chuẩn", express: "Giao nhanh" };

/** Standard: flat fee, free above a threshold, or 0 = fee confirmed by phone. Express: its own flat fee. */
export function shippingQuote(s: Pick<ShopSettings, "shippingFee" | "freeShipOver" | "expressFee">, subtotal: number, method: ShippingMethod = "standard"): { fee: number; mode: ShippingMode } {
  if (method === "express" && s.expressFee > 0) return { fee: s.expressFee, mode: "fixed" };
  if (s.freeShipOver > 0 && subtotal >= s.freeShipOver) return { fee: 0, mode: "free" };
  return s.shippingFee > 0 ? { fee: s.shippingFee, mode: "fixed" } : { fee: 0, mode: "phone" };
}
export const shippingText = (q: { fee: number; mode: ShippingMode }, money: (n: number) => string) =>
  q.mode === "free" ? "Miễn phí" : q.mode === "phone" ? "Shop báo khi xác nhận" : money(q.fee);

export const bankReady = (s: Pick<ShopSettings, "bankBin" | "bankAccount" | "bankHolder">) =>
  !!(s.bankBin && s.bankAccount && s.bankHolder);

// Bank BIN codes (Napas) used by VietQR.
export const BANKS: { bin: string; name: string }[] = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970441", name: "VIB" },
  { bin: "970437", name: "HDBank" },
  { bin: "970443", name: "SHB" },
  { bin: "970448", name: "OCB" },
  { bin: "970426", name: "MSB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970449", name: "LPBank" },
  { bin: "970428", name: "Nam A Bank" },
  { bin: "970409", name: "Bac A Bank" },
  { bin: "970412", name: "PVcomBank" },
  { bin: "970425", name: "ABBANK" },
  { bin: "970452", name: "Kienlongbank" },
  { bin: "970427", name: "VietABank" },
  { bin: "970419", name: "NCB" },
  { bin: "546034", name: "CAKE by VPBank" },
];

export const bankName = (bin: string) => BANKS.find((b) => b.bin === bin)?.name ?? bin;

/** VietQR image with the amount and transfer note filled in (scan with any banking app). */
export const vietQrUrl = (s: Pick<ShopSettings, "bankBin" | "bankAccount" | "bankHolder">, amount: number, info: string) =>
  `https://img.vietqr.io/image/${encodeURIComponent(s.bankBin)}-${encodeURIComponent(s.bankAccount)}-compact2.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent(s.bankHolder)}`;

export const ORDER_STATUS: Record<string, string> = {
  new: "Mới đặt",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  done: "Hoàn tất",
  cancelled: "Đã huỷ",
};

export type OrderItem = { id: string; name: string; price: number; qty: number; image: string; tracked: boolean };
export type PublicOrder = {
  code: string; name: string; phone: string; address: string; note: string;
  paymentMethod: "cod" | "bank"; paymentStatus: "unpaid" | "paid"; status: string;
  items: OrderItem[]; subtotal: number; shippingFee: number; shippingMode: ShippingMode; shippingMethod: ShippingMethod; total: number; createdAt: number;
  bank?: { bin: string; name: string; account: string; holder: string };
};

// ---- Bag stored in the visitor's browser ----
export const BAG_KEY = "chen-bag";
export function readBag(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(BAG_KEY) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) { const n = Math.floor(Number(v)); if (n > 0) out[k] = Math.min(99, n); }
    return out;
  } catch { return {}; }
}
export function writeBag(bag: Record<string, number>) {
  try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); window.dispatchEvent(new Event("chen-bag")); } catch {}
}
export const bagCount = (bag: Record<string, number>) => Object.values(bag).reduce((s, n) => s + n, 0);

export const ORDERS_KEY = "chen-orders";
export function rememberOrder(code: string, phone: string) {
  try {
    const list = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
    const next = [{ code, phone, at: Date.now() }, ...(Array.isArray(list) ? list : []).filter((o: { code?: string }) => o?.code !== code)].slice(0, 10);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  } catch {}
}
export function lastOrders(): { code: string; phone: string; at: number }[] {
  try { const list = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]"); return Array.isArray(list) ? list.filter((o) => typeof o?.code === "string" && typeof o?.phone === "string") : []; } catch { return []; }
}
