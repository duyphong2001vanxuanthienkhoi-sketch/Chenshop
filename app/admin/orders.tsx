"use client";
import { useEffect, useState } from "react";
import { AlertCircle, MessageCircle, Phone, RefreshCw, ShoppingBag, Check, Landmark, Banknote } from "lucide-react";
import { money } from "../../lib/catalog";
import { ORDER_STATUS, SHIPPING_LABEL, shippingText, type PublicOrder } from "../../lib/shop";

type AdminOrder = PublicOrder & { id: string; email: string };
const zaloLink = (phone: string) => "https://zalo.me/" + phone.replace(/^\+?84/, "0").replace(/\D/g, "");

export default function Orders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]), [busy, setBusy] = useState(true), [error, setError] = useState(""), [filter, setFilter] = useState("open"), [working, setWorking] = useState("");
  async function call(url: string, init?: RequestInit) {
    const r = await fetch(url, { ...init, cache: "no-store" });
    if (r.status === 401) { window.location.replace("/admin/login"); throw new Error("Phiên đăng nhập đã hết hạn."); }
    const x = await r.json().catch(() => ({})) as any;
    if (!r.ok) throw new Error(x.error ?? "Không thể thực hiện yêu cầu.");
    return x;
  }
  async function load() { setBusy(true); setError(""); try { setOrders((await call("/api/admin/orders")).orders); } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải đơn hàng."); } finally { setBusy(false); } }
  useEffect(() => { load(); }, []);

  async function update(o: AdminOrder, change: { status?: string; paymentStatus?: string }) {
    if (change.status === "cancelled" && !window.confirm(`Huỷ đơn ${o.code}? Số lượng tồn kho của các sản phẩm đã nhập tồn kho sẽ được cộng lại. Đơn đã huỷ không mở lại được.`)) return;
    setWorking(o.id); setError("");
    try {
      await call("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, ...change }) });
      setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, ...(change.status ? { status: change.status } : {}), ...(change.paymentStatus ? { paymentStatus: change.paymentStatus as "paid" | "unpaid" } : {}) } : x));
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể cập nhật."); } finally { setWorking(""); }
  }

  const open = (o: AdminOrder) => !["done", "cancelled"].includes(o.status);
  const shown = orders.filter((o) => filter === "all" || (filter === "open" ? open(o) : o.status === filter));
  const count = (f: string) => orders.filter((o) => f === "all" || (f === "open" ? open(o) : o.status === f)).length;
  const revenue = orders.filter((o) => o.status === "done").reduce((s, o) => s + o.total, 0);

  return <>
    <div className="stat-grid orders-stats">
      <div className="stat-card"><div><span>Cần xử lý</span><ShoppingBag size={19} /></div><strong>{busy ? "—" : count("open")}</strong><small>Đơn mới, đã xác nhận, đang giao</small></div>
      <div className="stat-card"><div><span>Mới đặt</span><AlertCircle size={19} /></div><strong className="red-text">{busy ? "—" : count("new")}</strong><small>Gọi khách để xác nhận</small></div>
      <div className="stat-card"><div><span>Hoàn tất</span><Check size={19} /></div><strong>{busy ? "—" : count("done")}</strong><small>Đã giao xong</small></div>
      <div className="stat-card"><div><span>Doanh thu hoàn tất</span><Banknote size={19} /></div><strong>{busy ? "—" : money(revenue)}</strong><small>Tổng các đơn hoàn tất</small></div>
    </div>
    {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
    <section className="inventory">
      <div className="inventory-top">
        <div className="inventory-tabs">{[["open", "Cần xử lý"], ["new", "Mới đặt"], ["shipping", "Đang giao"], ["done", "Hoàn tất"], ["cancelled", "Đã huỷ"], ["all", "Tất cả"]].map(([id, label]) => <button key={id} className={filter === id ? "selected" : ""} onClick={() => setFilter(id)}>{label}<span>{count(id)}</span></button>)}</div>
        <button className="icon-btn" aria-label="Tải lại đơn hàng" onClick={load} disabled={busy}><RefreshCw size={17} className={busy ? "spin" : ""} /></button>
      </div>
      {!shown.length ? <div className="empty-state"><ShoppingBag size={34} /><h3>{busy ? "Đang tải đơn hàng…" : "Chưa có đơn ở mục này."}</h3><p>Khách đặt hàng ở trang Thanh toán sẽ hiện ở đây ngay lập tức.</p></div> :
        <div className="order-cards">{shown.map((o) => (
          <article key={o.id} className={`order-card status-${o.status}`}>
            <header>
              <div><strong>{o.code}</strong><small>{new Date(o.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small></div>
              <select className={`lead-status order-status ${o.status}`} aria-label={`Trạng thái đơn ${o.code}`} value={o.status} disabled={working === o.id || o.status === "cancelled"} onChange={(e) => update(o, { status: e.target.value })}>
                {Object.entries(ORDER_STATUS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </header>
            <div className="order-card-customer">
              <b>{o.name}</b>
              <span className="lead-contact-links"><a href={"tel:" + o.phone}><Phone size={12} /> {o.phone}</a><a href={zaloLink(o.phone)} target="_blank" rel="noreferrer"><MessageCircle size={12} /> Zalo</a>{o.email && <a href={"mailto:" + o.email}>{o.email}</a>}</span>
              <p>{o.address}</p>
              {o.note && <p className="order-card-note">“{o.note}”</p>}
            </div>
            <ul className="order-card-items">{o.items.map((i) => <li key={i.id}><span>{i.name} <small>× {i.qty}</small></span><span>{money(i.price * i.qty)}</span></li>)}</ul>
            <div className="order-card-total"><span>{SHIPPING_LABEL[o.shippingMethod]}: {shippingText({ fee: o.shippingFee, mode: o.shippingMode }, money)}</span><b>{money(o.total)}</b></div>
            <footer>
              <span className="pay-method">{o.paymentMethod === "bank" ? <><Landmark size={14} /> Chuyển khoản</> : <><Banknote size={14} /> COD</>}</span>
              <a className="pay-toggle print-link" href={`/admin/in-phieu?id=${o.id}`} target="_blank" rel="noreferrer">In phiếu</a>
              <button type="button" className={`pay-toggle ${o.paymentStatus}`} disabled={working === o.id || o.status === "cancelled"} onClick={() => update(o, { paymentStatus: o.paymentStatus === "paid" ? "unpaid" : "paid" })}>
                {o.paymentStatus === "paid" ? <><Check size={13} /> Đã thanh toán</> : "Chưa thanh toán"}
              </button>
            </footer>
          </article>
        ))}</div>}
    </section>
  </>;
}
