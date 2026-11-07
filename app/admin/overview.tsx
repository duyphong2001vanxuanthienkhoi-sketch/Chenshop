"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Banknote, PackageX, ReceiptText, ShoppingBag, Star, TrendingUp, XCircle } from "lucide-react";
import { money, type Product } from "../../lib/catalog";
import type { PublicOrder } from "../../lib/shop";

type AdminOrder = PublicOrder & { id: string };
const DAY = 86400000;
const vnDay = (t: number) => new Date(t + 7 * 3600000).toISOString().slice(0, 10); // YYYY-MM-DD in Vietnam time
const compact = (n: number) => n >= 1e6 ? `${Math.round(n / 1e5) / 10}tr` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);

/** Store overview: revenue, orders, cancel rate, best sellers and things to do. */
export default function Overview({ products, go }: { products: Product[]; go: (view: string) => void }) {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null), [pendingReviews, setPendingReviews] = useState(0), [range, setRange] = useState(30), [error, setError] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const [o, r] = await Promise.all([fetch("/api/admin/orders", { cache: "no-store" }), fetch("/api/admin/reviews", { cache: "no-store" })]);
        if (o.status === 401) { window.location.replace("/admin/login"); return; }
        const ox = await o.json(); if (!o.ok) throw new Error(ox.error ?? "Không tải được đơn hàng.");
        setOrders(ox.orders);
        if (r.ok) setPendingReviews(((await r.json()).reviews as { status: string }[]).filter((x) => x.status === "pending").length);
      } catch (e) { setError(e instanceof Error ? e.message : "Không tải được số liệu."); setOrders([]); }
    })();
  }, []);

  const stats = useMemo(() => {
    const list = orders ?? [];
    const since = Date.now() - range * DAY;
    const inRange = list.filter((o) => o.createdAt >= since);
    const valid = inRange.filter((o) => o.status !== "cancelled");
    const revenue = valid.reduce((s, o) => s + o.total, 0);
    const cancelled = inRange.length - valid.length;
    // revenue buckets: one bar per day (7/30 days) or per week (90 days)
    const weekly = range > 31;
    const buckets: { key: string; label: string; value: number; orders: number }[] = [];
    const today = new Date(vnDay(Date.now()) + "T00:00:00Z").getTime();
    const n = weekly ? Math.ceil(range / 7) : range;
    for (let i = n - 1; i >= 0; i--) {
      const start = today - (weekly ? (i * 7 + 6) : i) * DAY;
      const d = new Date(start);
      buckets.push({ key: String(start), label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, value: 0, orders: 0 });
    }
    for (const o of valid) {
      const day = new Date(vnDay(o.createdAt) + "T00:00:00Z").getTime();
      const idx = weekly ? buckets.findIndex((b, i) => day >= Number(b.key) && (i === buckets.length - 1 || day < Number(buckets[i + 1].key))) : buckets.findIndex((b) => Number(b.key) === day);
      if (idx >= 0) { buckets[idx].value += o.total; buckets[idx].orders++; }
    }
    const top = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of valid) for (const i of o.items) {
      const t = top.get(i.id) ?? { name: i.name, qty: 0, revenue: 0 };
      t.qty += i.qty; t.revenue += i.qty * i.price; top.set(i.id, t);
    }
    return {
      revenue, count: valid.length, aov: valid.length ? Math.round(revenue / valid.length) : 0,
      cancelRate: inRange.length ? Math.round((cancelled / inRange.length) * 100) : 0, cancelled,
      buckets, weekly, top: [...top.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5),
      newOrders: list.filter((o) => o.status === "new").length,
    };
  }, [orders, range]);

  const max = Math.max(...stats.buckets.map((b) => b.value), 0);
  const niceMax = max <= 0 ? 100000 : (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p) * p; })();
  const peak = stats.buckets.reduce((best, b) => (b.value > (best?.value ?? 0) ? b : best), null as null | typeof stats.buckets[number]);
  const noPrice = products.filter((p) => p.pricePending).length;
  const outOfStock = products.filter((p) => !p.stockPending && p.stock === 0 && !p.pricePending).length;
  const loading = orders === null;

  return <>
    <div className="overview-toolbar" role="group" aria-label="Khoảng thời gian">
      {[7, 30, 90].map((d) => <button key={d} className={range === d ? "selected" : ""} onClick={() => setRange(d)}>{d} ngày</button>)}
    </div>
    {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
    <div className="stat-grid">
      <div className="stat-card"><div><span>Doanh thu</span><Banknote size={19} /></div><strong>{loading ? "—" : money(stats.revenue)}</strong><small>Đơn không huỷ trong {range} ngày</small></div>
      <div className="stat-card"><div><span>Số đơn</span><ReceiptText size={19} /></div><strong>{loading ? "—" : stats.count}</strong><small>Giá trị TB {loading ? "—" : money(stats.aov)}/đơn</small></div>
      <div className="stat-card"><div><span>Tỷ lệ huỷ</span><XCircle size={19} /></div><strong>{loading ? "—" : `${stats.cancelRate}%`}</strong><small>{stats.cancelled} đơn huỷ trong {range} ngày</small></div>
      <div className="stat-card"><div><span>Đơn mới cần gọi</span><ShoppingBag size={19} /></div><strong className={stats.newOrders ? "red-text" : ""}>{loading ? "—" : stats.newOrders}</strong><small>Trạng thái “Mới đặt”</small></div>
    </div>

    <section className="inventory chart-card">
      <div className="chart-head">
        <div><h2>Doanh thu theo {stats.weekly ? "tuần" : "ngày"}</h2><p>{range} ngày gần nhất · không tính đơn huỷ{peak ? ` · cao nhất ${money(peak.value)} (${peak.label})` : ""}</p></div>
        <TrendingUp size={20} />
      </div>
      <div className="bar-chart" style={{ ["--cols" as string]: stats.buckets.length }}>
        <div className="bar-chart-axis" aria-hidden="true">{[1, 0.5, 0].map((f) => <span key={f} style={{ bottom: `${f * 100}%` }}>{compact(Math.round(niceMax * f))}</span>)}</div>
        <div className="bar-chart-plot">
          {[1, 0.5].map((f) => <i key={f} className="grid-line" style={{ bottom: `${f * 100}%` }} aria-hidden="true" />)}
          {stats.buckets.map((b, i) => {
            const h = niceMax ? (b.value / niceMax) * 100 : 0;
            const showLabel = i % Math.ceil(stats.buckets.length / 8) === 0 || i === stats.buckets.length - 1;
            return (
              <div key={b.key} className="bar-col" tabIndex={0} aria-label={`${b.label}: ${money(b.value)}, ${b.orders} đơn`}>
                <span className="bar" style={{ height: `${Math.max(h, b.value ? 1.5 : 0)}%` }} />
                <span className={`bar-tip ${i < stats.buckets.length / 2 ? "from-left" : "from-right"}`} role="tooltip"><b>{money(b.value)}</b>{b.orders} đơn · {stats.weekly ? "tuần từ " : ""}{b.label}</span>
                <span className={`bar-label ${showLabel ? "" : "hide"}`}>{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <details className="chart-table"><summary>Xem bảng số liệu</summary>
        <table className="products-table"><thead><tr><th>{stats.weekly ? "TUẦN TỪ" : "NGÀY"}</th><th>DOANH THU</th><th>SỐ ĐƠN</th></tr></thead>
          <tbody>{stats.buckets.filter((b) => b.orders).reverse().map((b) => <tr key={b.key}><td>{b.label}</td><td>{money(b.value)}</td><td>{b.orders}</td></tr>)}
            {!stats.buckets.some((b) => b.orders) && <tr><td colSpan={3}>Chưa có đơn trong khoảng này.</td></tr>}</tbody></table>
      </details>
    </section>

    <div className="overview-grid">
      <section className="inventory overview-card">
        <h2>Bán chạy nhất · {range} ngày</h2>
        {!stats.top.length ? <p className="muted">Chưa có đơn hàng.</p> :
          <ol className="top-products">{stats.top.map((t, i) => (
            <li key={t.name}><span className="rank">{i + 1}</span><span className="top-name">{t.name}</span><span className="top-meter" aria-hidden="true"><i style={{ width: `${(t.qty / stats.top[0].qty) * 100}%` }} /></span><b>{t.qty} cái</b><small>{money(t.revenue)}</small></li>
          ))}</ol>}
      </section>
      <section className="inventory overview-card">
        <h2>Việc cần làm</h2>
        <ul className="todo-list">
          <li><button onClick={() => go("orders")}><ShoppingBag size={16} /> <b>{stats.newOrders}</b> đơn mới cần gọi xác nhận</button></li>
          <li><button onClick={() => go("reviews")}><Star size={16} /> <b>{pendingReviews}</b> đánh giá chờ duyệt</button></li>
          <li><button onClick={() => go("products")}><AlertCircle size={16} /> <b>{noPrice}</b> sản phẩm chưa có giá (đang hiện “Sắp về hàng”)</button></li>
          <li><button onClick={() => go("products")}><PackageX size={16} /> <b>{outOfStock}</b> sản phẩm hết hàng</button></li>
        </ul>
      </section>
    </div>
  </>;
}
