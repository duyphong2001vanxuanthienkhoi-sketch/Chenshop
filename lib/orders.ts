import { query, queryOne, type Row } from "./db";
import { BANKS, bankName, bankReady, emptySettings, maxOrderQty, shippingQuote, type OrderItem, type PublicOrder, type ShippingMethod, type ShopSettings } from "./shop";

export async function loadSettings(): Promise<ShopSettings> {
  const r = await queryOne("SELECT * FROM settings WHERE id='shop'");
  if (!r) return { ...emptySettings };
  return {
    contact: String(r.contact ?? ""), instagram: String(r.instagram ?? ""),
    bankBin: String(r.bank_bin ?? ""), bankAccount: String(r.bank_account ?? ""), bankHolder: String(r.bank_holder ?? ""),
    shippingFee: Number(r.shipping_fee ?? 0), freeShipOver: Number(r.free_ship_over ?? 0), expressFee: Number(r.express_fee ?? 0),
  };
}

/** Uppercase, no Vietnamese accents: what banks show and VietQR expects. */
export function plainUpper(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function validateSettings(x: any): Omit<ShopSettings, "contact" | "instagram"> {
  const bankBin = String(x.bankBin ?? "").trim(), bankAccount = String(x.bankAccount ?? "").replace(/\s/g, ""), bankHolder = plainUpper(String(x.bankHolder ?? "")).slice(0, 60);
  const shippingFee = Number(x.shippingFee ?? 0), freeShipOver = Number(x.freeShipOver ?? 0), expressFee = Number(x.expressFee ?? 0);
  if (bankBin && !BANKS.some((b) => b.bin === bankBin)) throw new Error("Ngân hàng không hợp lệ.");
  if (bankAccount && !/^[0-9A-Za-z]{4,25}$/.test(bankAccount)) throw new Error("Số tài khoản chỉ gồm chữ số (4–25 ký tự).");
  if ((bankBin || bankAccount || bankHolder) && !(bankBin && bankAccount && bankHolder)) throw new Error("Nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản, hoặc để trống cả ba.");
  if (!Number.isSafeInteger(shippingFee) || shippingFee < 0 || shippingFee > 1000000) throw new Error("Phí giao hàng từ 0 đến 1.000.000 đ.");
  if (!Number.isSafeInteger(freeShipOver) || freeShipOver < 0 || freeShipOver > 100000000) throw new Error("Mức miễn phí giao hàng không hợp lệ.");
  if (!Number.isSafeInteger(expressFee) || expressFee < 0 || expressFee > 2000000) throw new Error("Phí giao nhanh từ 0 đến 2.000.000 đ.");
  return { bankBin, bankAccount, bankHolder, shippingFee, freeShipOver, expressFee };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newOrderCode() {
  const vn = new Date(Date.now() + 7 * 3600 * 1000).toISOString();
  const ymd = vn.slice(2, 4) + vn.slice(5, 7) + vn.slice(8, 10);
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return "CS" + ymd + Array.from(bytes, (b) => CODE_ALPHABET[b % 32]).join("");
}

export const normalizePhone = (phone: string) => phone.replace(/[\s.()-]/g, "").replace(/^\+?84/, "0");

export type OrderInput = { id: string; name: string; phone: string; email: string; address: string; note: string; payment: "cod" | "bank"; shipping: ShippingMethod; items: { id: string; qty: number }[] };

export function validateOrder(x: any): OrderInput {
  if (!x || typeof x !== "object") throw new Error("Thông tin đơn hàng không hợp lệ.");
  const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const id = text(x.id, 40), name = text(x.name, 100), phone = normalizePhone(text(x.phone, 24)), email = text(x.email, 120), address = text(x.address, 400), note = text(x.note, 1000);
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Phiên đặt hàng không hợp lệ. Vui lòng tải lại trang.");
  if (name.length < 2) throw new Error("Vui lòng nhập họ tên người nhận.");
  if (!/^0[35789]\d{8}$/.test(phone)) throw new Error("Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 số).");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("Email chưa đúng định dạng.");
  if (address.length < 10) throw new Error("Vui lòng nhập địa chỉ nhận hàng đầy đủ (số nhà, đường, phường/xã, tỉnh/thành).");
  if (x.payment !== "cod" && x.payment !== "bank") throw new Error("Vui lòng chọn phương thức thanh toán.");
  const shipping: ShippingMethod = x.shipping === "express" ? "express" : "standard";
  if (!Array.isArray(x.items) || !x.items.length) throw new Error("Túi hàng đang trống.");
  const merged = new Map<string, number>();
  for (const it of x.items.slice(0, 40)) {
    const pid = text(it?.id, 100), qty = Number(it?.qty);
    if (!pid || !Number.isInteger(qty) || qty < 1 || qty > 99) throw new Error("Số lượng sản phẩm không hợp lệ.");
    merged.set(pid, (merged.get(pid) ?? 0) + qty);
  }
  if (merged.size > 30) throw new Error("Mỗi đơn tối đa 30 mẫu khác nhau.");
  return { id, name, phone, email, address, note, payment: x.payment, shipping, items: [...merged].map(([id, qty]) => ({ id, qty })) };
}

/** Prices, availability and stock are always taken from the database, never from the browser. */
export async function priceOrder(input: OrderInput, settings: ShopSettings) {
  const ids = input.items.map((i) => i.id);
  const rows = await query(`SELECT id,name,price,stock,stock_pending,price_pending,published,image FROM products WHERE id = ANY($1::text[])`, [ids]);
  const byId = new Map(rows.map((r) => [String(r.id), r]));
  const items: OrderItem[] = [];
  for (const it of input.items) {
    const r = byId.get(it.id);
    if (!r || !r.published) throw new Error("Có sản phẩm trong túi không còn bán. Vui lòng xoá sản phẩm đó và thử lại.");
    const name = String(r.name);
    if (r.price_pending || Number(r.price) <= 0) throw new Error(`"${name}" đang chờ cập nhật giá nên chưa đặt mua được.`);
    const p = { stockPending: !!r.stock_pending, stock: Number(r.stock) };
    if (!p.stockPending && p.stock <= 0) throw new Error(`"${name}" vừa hết hàng. Vui lòng xoá khỏi túi.`);
    const max = maxOrderQty(p);
    if (it.qty > max) throw new Error(p.stockPending ? `"${name}" đặt tối đa ${max} sản phẩm mỗi đơn.` : `"${name}" chỉ còn ${max} sản phẩm.`);
    items.push({ id: it.id, name, price: Number(r.price), qty: it.qty, image: String(r.image), tracked: !p.stockPending });
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  if (input.shipping === "express" && settings.expressFee <= 0) throw new Error("Shop chưa mở giao nhanh. Vui lòng chọn giao tiêu chuẩn.");
  const quote = shippingQuote(settings, subtotal, input.shipping);
  if (input.payment === "bank" && !bankReady(settings)) throw new Error("Shop chưa mở thanh toán chuyển khoản. Vui lòng chọn thanh toán khi nhận hàng.");
  return { items, subtotal, shippingFee: quote.fee, shippingMode: quote.mode, total: subtotal + quote.fee };
}

/**
 * Inserts the order and decrements tracked stock in ONE statement, so it is atomic:
 * if any tracked product no longer has enough stock, the division by zero aborts
 * the whole statement (no order, no stock change).
 */
export async function insertOrder(input: OrderInput, priced: Awaited<ReturnType<typeof priceOrder>>, code: string, ipHash: string) {
  const tracked = priced.items.filter((i) => i.tracked);
  const now = Date.now();
  const params: unknown[] = [input.id, code, input.name, input.phone, input.email, input.address, input.note, input.payment, JSON.stringify(priced.items), priced.subtotal, priced.shippingFee, priced.total, ipHash, now, tracked.length, input.shipping, priced.shippingMode];
  const values = tracked.map((t) => { params.push(t.id, t.qty); return `($${params.length - 1}::text, $${params.length}::int)`; });
  const sql = `
    WITH v(id, qty) AS (${values.length ? `VALUES ${values.join(",")}` : "SELECT NULL::text, NULL::int WHERE FALSE"}),
    upd AS (
      UPDATE products p SET stock = p.stock - v.qty, updated_at = $14
      FROM v WHERE p.id = v.id AND p.stock_pending = FALSE AND p.stock >= v.qty
      RETURNING p.id
    )
    INSERT INTO orders (id,code,name,phone,email,address,note,payment_method,items,subtotal,shipping_fee,total,ip_hash,created_at,updated_at,shipping_method,shipping_mode)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$16,$17
    WHERE 1 / (CASE WHEN (SELECT COUNT(*) FROM upd) = $15 THEN 1 ELSE 0 END) = 1
    RETURNING id`;
  try {
    await query(sql, params);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/division by zero/i.test(msg)) throw new Error("Một sản phẩm trong túi vừa hết hoặc không đủ số lượng. Vui lòng tải lại trang và thử lại.");
    throw e;
  }
}

export function rowOrder(r: Row, settings?: ShopSettings): PublicOrder {
  let items: OrderItem[] = [];
  try { items = JSON.parse(String(r.items ?? "[]")); } catch {}
  const order: PublicOrder = {
    code: String(r.code), name: String(r.name), phone: String(r.phone), address: String(r.address), note: String(r.note ?? ""),
    paymentMethod: r.payment_method === "bank" ? "bank" : "cod", paymentStatus: r.payment_status === "paid" ? "paid" : "unpaid",
    status: String(r.status), items, subtotal: Number(r.subtotal), shippingFee: Number(r.shipping_fee),
    shippingMode: r.shipping_mode === "free" || r.shipping_mode === "fixed" ? r.shipping_mode : Number(r.shipping_fee) > 0 ? "fixed" : "phone",
    shippingMethod: r.shipping_method === "express" ? "express" : "standard", total: Number(r.total), createdAt: Number(r.created_at),
  };
  if (settings && order.paymentMethod === "bank" && bankReady(settings)) {
    order.bank = { bin: settings.bankBin, name: bankName(settings.bankBin), account: settings.bankAccount, holder: settings.bankHolder };
  }
  return order;
}
