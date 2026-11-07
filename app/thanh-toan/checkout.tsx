"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, ArrowUpRight, Banknote, Landmark, Lock, Minus, Plus, ShoppingBag, Truck, X, Zap } from "lucide-react";
import { Logo, ProductImage } from "../ui";
import OrderView from "../order-view";
import { money, type Product } from "../../lib/catalog";
import { ZALO_PHONE, ZALO_URL } from "../../lib/contact";
import { newRequestId } from "../../lib/request-id";
import { bankName, bankReady, canOrder, emptySettings, maxOrderQty, readBag, rememberOrder, shippingQuote, shippingText, writeBag, type PublicOrder, type ShippingMethod, type ShopSettings } from "../../lib/shop";

export default function Checkout() {
  const [products, setProducts] = useState<Product[] | null>(null), [settings, setSettings] = useState<ShopSettings>(emptySettings);
  const [bag, setBag] = useState<Record<string, number>>({}), [loadError, setLoadError] = useState("");
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [email, setEmail] = useState(""), [address, setAddress] = useState(""), [note, setNote] = useState(""), [website, setWebsite] = useState("");
  const [payment, setPayment] = useState<"cod" | "bank">("cod"), [shipMethod, setShipMethod] = useState<ShippingMethod>("standard"), [busy, setBusy] = useState(false), [error, setError] = useState(""), [order, setOrder] = useState<PublicOrder | null>(null);
  const [checkoutId, setCheckoutId] = useState("");

  async function load() {
    setLoadError("");
    try {
      const [pr, sr] = await Promise.all([fetch("/api/products", { cache: "no-store" }), fetch("/api/settings", { cache: "no-store" })]);
      const p = await pr.json() as { products?: Product[]; error?: string };
      if (!pr.ok || !p.products) throw new Error(p.error ?? "Không tải được sản phẩm.");
      setProducts(p.products);
      if (sr.ok) setSettings({ ...emptySettings, ...(await sr.json()) });
    } catch (e) { setLoadError(e instanceof Error ? e.message : "Không tải được sản phẩm."); }
  }
  useEffect(() => {
    setBag(readBag());
    setCheckoutId(newRequestId());
    load();
    const sync = () => setBag(readBag());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const lines = useMemo(() => {
    if (!products) return [];
    return Object.entries(bag).map(([id, qty]) => {
      const p = products.find((x) => x.id === id);
      return p ? { p, qty: Math.min(qty, Math.max(1, maxOrderQty(p))), ok: canOrder(p) } : null;
    }).filter((l): l is { p: Product; qty: number; ok: boolean } => !!l);
  }, [products, bag]);
  const buyable = lines.filter((l) => l.ok);
  const subtotal = buyable.reduce((s, l) => s + l.p.price * l.qty, 0);
  const method: ShippingMethod = shipMethod === "express" && settings.expressFee > 0 ? "express" : "standard";
  const quote = shippingQuote(settings, subtotal, method), shipping = quote.fee;
  const standardQuote = shippingQuote(settings, subtotal, "standard");
  const bankOn = bankReady(settings);
  const count = buyable.reduce((s, l) => s + l.qty, 0);

  function setQty(id: string, qty: number) {
    const next = { ...bag };
    if (qty <= 0) delete next[id]; else next[id] = qty;
    setBag(next); writeBag(next);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !buyable.length) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: checkoutId, name, phone, email, address, note, payment, shipping: method, website, items: buyable.map((l) => ({ id: l.p.id, qty: l.qty })) }),
      });
      const x = await r.json().catch(() => ({})) as { order?: PublicOrder; error?: string };
      if (!r.ok || !x.order) throw new Error(x.error ?? "Chưa đặt được hàng. Vui lòng thử lại.");
      const remaining = { ...bag };
      for (const l of buyable) delete remaining[l.p.id];
      writeBag(remaining); setBag(remaining);
      rememberOrder(x.order.code, x.order.phone);
      setOrder(x.order);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kết nối bị gián đoạn. Bấm Đặt hàng lần nữa, đơn sẽ không bị tạo trùng.");
    } finally { setBusy(false); }
  }

  const header = (
    <>
      <div className="announcement"><span>CHEN SHOP — THANH TOÁN AN TOÀN, KHÔNG CẦN TÀI KHOẢN</span></div>
      <header className="site-header"><div className="nav-main"><Logo /><a className="text-button" href="/#san-pham"><ArrowLeft size={15} /> Tiếp tục mua sắm</a></div></header>
    </>
  );

  if (order) return (
    <>{header}
      <main className="checkout section-wrap">
        <div className="order-success">
          <span className="order-success-icon"><ShoppingBag size={26} /></span>
          <h1>Cảm ơn bạn đã đặt hàng<span className="red-text">.</span></h1>
          <p>Chen Shop đã nhận đơn <b>{order.code}</b>. Lưu lại mã này để tra cứu tình trạng đơn.</p>
        </div>
        <OrderView order={order} />
        <div className="order-actions">
          <a className="btn red" href={`/don-hang?code=${order.code}`}>TRA CỨU ĐƠN HÀNG <ArrowUpRight size={16} /></a>
          <a className="btn zalo-inline" href={ZALO_URL} target="_blank" rel="noreferrer">NHẮN ZALO {ZALO_PHONE} <ArrowUpRight size={16} /></a>
          <a className="btn outline" href="/#san-pham">TIẾP TỤC MUA SẮM</a>
        </div>
      </main>
    </>
  );

  return (
    <>{header}
      <main className="checkout section-wrap">
        <div className="checkout-title">
          <span className="eyebrow muted">CHECKOUT / KHÔNG CẦN ĐĂNG KÝ</span>
          <h1>Thanh toán<span className="red-text">.</span></h1>
        </div>
        {loadError ? (
          <div className="error-box" role="alert"><AlertCircle size={18} /><span>{loadError}</span><button onClick={load}>Thử lại</button></div>
        ) : !products ? (
          <div className="checkout-loading"><div className="skeleton" /><div className="skeleton" /></div>
        ) : !lines.length ? (
          <div className="empty-state"><ShoppingBag size={38} /><h3>Túi hàng đang trống.</h3><p>Chọn vài người bạn nhỏ rồi quay lại đây để thanh toán nhé.</p><a className="btn red" href="/#san-pham">KHÁM PHÁ SẢN PHẨM <ArrowUpRight size={16} /></a></div>
        ) : (
          <form className="checkout-grid" onSubmit={submit}>
            <div className="checkout-main">
              <section className="checkout-card">
                <h2><span>1</span> Sản phẩm ({count})</h2>
                {lines.map(({ p, qty, ok }) => (
                  <div className={`checkout-line ${ok ? "" : "unavailable"}`} key={p.id}>
                    <a href={`/san-pham/${p.id}`} className="checkout-thumb"><ProductImage product={p} /></a>
                    <div className="checkout-line-info">
                      <a href={`/san-pham/${p.id}`}>{p.name}</a>
                      <span>{ok ? money(p.price) : p.pricePending ? "Chờ cập nhật giá — chưa bán" : "Tạm hết hàng"}</span>
                      {ok && p.stockPending && <small>Shop xác nhận còn hàng khi gọi lại</small>}
                      {ok && (
                        <div className="quantity">
                          <button type="button" aria-label={`Giảm số lượng ${p.name}`} onClick={() => setQty(p.id, qty - 1)}><Minus size={14} /></button>
                          <span aria-live="polite">{qty}</span>
                          <button type="button" aria-label={`Tăng số lượng ${p.name}`} disabled={qty >= maxOrderQty(p)} onClick={() => setQty(p.id, qty + 1)}><Plus size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div className="checkout-line-end">
                      {ok && <b>{money(p.price * qty)}</b>}
                      <button type="button" className="icon-btn" aria-label={`Xoá ${p.name} khỏi túi`} onClick={() => setQty(p.id, 0)}><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </section>

              <section className="checkout-card">
                <h2><span>2</span> Thông tin nhận hàng</h2>
                <div className="lead-form checkout-fields">
                  <div className="two-fields">
                    <label>Họ và tên <b>*</b><input required autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Người nhận hàng" disabled={busy} /></label>
                    <label>Số điện thoại <b>*</b><input required type="tel" inputMode="tel" autoComplete="tel" maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại / Zalo" disabled={busy} /></label>
                  </div>
                  <label>Địa chỉ nhận hàng <b>*</b><textarea required rows={2} autoComplete="street-address" maxLength={400} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố" disabled={busy} /></label>
                  <label>Email <span>(không bắt buộc)</span><input type="email" autoComplete="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Để nhận thông tin đơn hàng" disabled={busy} /></label>
                  <label>Ghi chú cho shop<textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thời gian nhận hàng, gói quà…" disabled={busy} /></label>
                  <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                </div>
              </section>

              <section className="checkout-card">
                <h2><span>3</span> Vận chuyển</h2>
                <div className="pay-options" role="radiogroup" aria-label="Phương thức vận chuyển">
                  <label className={`pay-option ${method === "standard" ? "selected" : ""}`}>
                    <input type="radio" name="shipping" value="standard" checked={method === "standard"} onChange={() => setShipMethod("standard")} disabled={busy} />
                    <Truck size={22} />
                    <span><strong>Giao tiêu chuẩn · {shippingText(standardQuote, money)}</strong><small>Giao toàn quốc qua đơn vị vận chuyển, thường 2–4 ngày.{settings.freeShipOver > 0 ? ` Miễn phí cho đơn từ ${money(settings.freeShipOver)}.` : ""}</small></span>
                  </label>
                  {settings.expressFee > 0 && (
                    <label className={`pay-option ${method === "express" ? "selected" : ""}`}>
                      <input type="radio" name="shipping" value="express" checked={method === "express"} onChange={() => setShipMethod("express")} disabled={busy} />
                      <Zap size={22} />
                      <span><strong>Giao nhanh · {money(settings.expressFee)}</strong><small>Ưu tiên giao sớm (hoả tốc nội thành). Shop gọi xác nhận khung giờ.</small></span>
                    </label>
                  )}
                </div>
              </section>

              <section className="checkout-card">
                <h2><span>4</span> Phương thức thanh toán</h2>
                <div className="pay-options" role="radiogroup" aria-label="Phương thức thanh toán">
                  <label className={`pay-option ${payment === "cod" ? "selected" : ""}`}>
                    <input type="radio" name="payment" value="cod" checked={payment === "cod"} onChange={() => setPayment("cod")} disabled={busy} />
                    <Banknote size={22} />
                    <span><strong>Thanh toán khi nhận hàng (COD)</strong><small>Trả tiền mặt cho shipper khi nhận hàng.</small></span>
                  </label>
                  <label className={`pay-option ${payment === "bank" ? "selected" : ""} ${bankOn ? "" : "disabled"}`}>
                    <input type="radio" name="payment" value="bank" checked={payment === "bank"} onChange={() => setPayment("bank")} disabled={busy || !bankOn} />
                    <Landmark size={22} />
                    <span><strong>Chuyển khoản ngân hàng (VietQR)</strong><small>{bankOn ? `Quét mã QR ${bankName(settings.bankBin)} sau khi đặt — số tiền và nội dung điền sẵn.` : "Shop chưa mở hình thức này."}</small></span>
                  </label>
                </div>
              </section>
            </div>

            <aside className="checkout-summary">
              <h2>Tóm tắt đơn hàng</h2>
              <div className="order-line muted"><span>Tạm tính ({count} sản phẩm)</span><span>{money(subtotal)}</span></div>
              <div className="order-line muted"><span>{method === "express" ? "Giao nhanh" : "Phí giao hàng"}</span><span>{shippingText(quote, money)}</span></div>
              {method === "standard" && settings.freeShipOver > 0 && subtotal < settings.freeShipOver && <p className="free-ship-hint">Mua thêm {money(settings.freeShipOver - subtotal)} để được miễn phí giao hàng.</p>}
              <div className="order-line total"><span>Tổng cộng</span><b>{money(subtotal + shipping)}</b></div>
              {error && <div className="error-box" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
              <button className="btn red full" type="submit" disabled={busy || !buyable.length}>{busy ? "ĐANG ĐẶT HÀNG…" : `ĐẶT HÀNG · ${money(subtotal + shipping)}`}</button>
              <p className="checkout-safe"><Lock size={13} /> Không cần tạo tài khoản. Shop gọi xác nhận trước khi giao.</p>
              <p className="checkout-help">Cần hỗ trợ? <a href={ZALO_URL} target="_blank" rel="noreferrer">Zalo {ZALO_PHONE}</a></p>
            </aside>
          </form>
        )}
      </main>
    </>
  );
}
