"use client";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, Search } from "lucide-react";
import { Logo } from "../ui";
import OrderView from "../order-view";
import ThemeToggle from "../theme-toggle";
import { lastOrders, type PublicOrder } from "../../lib/shop";
import { ZALO_PHONE, ZALO_URL } from "../../lib/contact";

export default function Lookup() {
  const [code, setCode] = useState(""), [phone, setPhone] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [order, setOrder] = useState<PublicOrder | null>(null);
  const [recent, setRecent] = useState<{ code: string; phone: string }[]>([]);

  async function find(c = code, p = phone) {
    setBusy(true); setError(""); setOrder(null);
    try {
      const r = await fetch(`/api/orders/lookup?code=${encodeURIComponent(c.trim())}&phone=${encodeURIComponent(p.trim())}`, { cache: "no-store" });
      const x = await r.json().catch(() => ({})) as { order?: PublicOrder; error?: string };
      if (!r.ok || !x.order) throw new Error(x.error ?? "Không tìm thấy đơn hàng.");
      setOrder(x.order);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể tra cứu."); } finally { setBusy(false); }
  }

  useEffect(() => {
    const list = lastOrders();
    setRecent(list);
    const q = new URLSearchParams(window.location.search).get("code")?.toUpperCase() ?? "";
    const match = list.find((o) => o.code === q) ?? (q ? undefined : list[0]);
    if (q) setCode(q);
    if (match) { setCode(match.code); setPhone(match.phone); find(match.code, match.phone); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: FormEvent) { e.preventDefault(); if (!busy) find(); }

  return (
    <>
      <div className="announcement"><span>CHEN SHOP — TRA CỨU ĐƠN HÀNG</span></div>
      <header className="site-header"><div className="nav-main"><Logo /><div className="header-actions"><a className="text-button" href="/#san-pham"><ArrowLeft size={15} /> Về cửa hàng</a><ThemeToggle /></div></div></header>
      <main className="checkout section-wrap">
        <div className="checkout-title">
          <span className="eyebrow muted">ORDER TRACKING</span>
          <h1>Tra cứu đơn hàng<span className="red-text">.</span></h1>
        </div>
        <form className="lookup-form lead-form" onSubmit={submit}>
          <div className="two-fields">
            <label>Mã đơn hàng<input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VD: CS261107ABCDE" maxLength={16} autoCapitalize="characters" /></label>
            <label>Số điện thoại đặt hàng<input required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" maxLength={16} /></label>
          </div>
          <button className="btn red" type="submit" disabled={busy}><Search size={16} />{busy ? "ĐANG TÌM…" : "TRA CỨU"}</button>
          {recent.length > 1 && <div className="recent-orders"><span>Đơn gần đây trên máy này:</span>{recent.map((o) => <button type="button" key={o.code} className="copy-chip" onClick={() => { setCode(o.code); setPhone(o.phone); find(o.code, o.phone); }}>{o.code}</button>)}</div>}
        </form>
        {error && <div className="error-box" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
        {order && <OrderView order={order} />}
        <p className="checkout-help">Cần hỗ trợ về đơn hàng? <a href={ZALO_URL} target="_blank" rel="noreferrer">Nhắn Zalo {ZALO_PHONE}</a></p>
      </main>
    </>
  );
}
