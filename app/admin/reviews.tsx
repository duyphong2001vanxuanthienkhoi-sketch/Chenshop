"use client";
import { useEffect, useState } from "react";
import { AlertCircle, Check, EyeOff, RefreshCw, Star, Trash2 } from "lucide-react";

type Review = { id: string; productId: string; productName: string; orderCode: string; name: string; rating: number; content: string; photo: string; status: string; createdAt: number };
const LABEL: Record<string, string> = { pending: "Chờ duyệt", approved: "Đang hiển thị", hidden: "Đã ẩn" };

/** Moderation of buyer reviews: approve to show on the product page, hide or delete. */
export default function Reviews() {
  const [list, setList] = useState<Review[]>([]), [busy, setBusy] = useState(true), [error, setError] = useState(""), [filter, setFilter] = useState("pending"), [working, setWorking] = useState("");
  async function call(url: string, init?: RequestInit) {
    const r = await fetch(url, { ...init, cache: "no-store" });
    if (r.status === 401) { window.location.replace("/admin/login"); throw new Error("Phiên đăng nhập đã hết hạn."); }
    const x = await r.json().catch(() => ({})) as any;
    if (!r.ok) throw new Error(x.error ?? "Không thể thực hiện yêu cầu.");
    return x;
  }
  async function load() { setBusy(true); setError(""); try { setList((await call("/api/admin/reviews")).reviews); } catch (e) { setError(e instanceof Error ? e.message : "Không tải được đánh giá."); } finally { setBusy(false); } }
  useEffect(() => { load(); }, []);
  async function setStatus(r: Review, status: string) {
    setWorking(r.id);
    try { await call("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, status }) }); setList((p) => p.map((x) => x.id === r.id ? { ...x, status } : x)); }
    catch (e) { setError(e instanceof Error ? e.message : "Không cập nhật được."); } finally { setWorking(""); }
  }
  async function remove(r: Review) {
    if (!window.confirm(`Xoá vĩnh viễn đánh giá của ${r.name}?`)) return;
    setWorking(r.id);
    try { await call("/api/admin/reviews?id=" + r.id, { method: "DELETE" }); setList((p) => p.filter((x) => x.id !== r.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Không xoá được."); } finally { setWorking(""); }
  }
  const shown = list.filter((r) => filter === "all" || r.status === filter);
  const count = (f: string) => list.filter((r) => f === "all" || r.status === f).length;
  return <>
    {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
    <section className="inventory">
      <div className="inventory-top">
        <div className="inventory-tabs">{[["pending", "Chờ duyệt"], ["approved", "Đang hiển thị"], ["hidden", "Đã ẩn"], ["all", "Tất cả"]].map(([id, label]) => <button key={id} className={filter === id ? "selected" : ""} onClick={() => setFilter(id)}>{label}<span>{count(id)}</span></button>)}</div>
        <button className="icon-btn" aria-label="Tải lại đánh giá" onClick={load} disabled={busy}><RefreshCw size={17} className={busy ? "spin" : ""} /></button>
      </div>
      {!shown.length ? <div className="empty-state"><Star size={34} /><h3>{busy ? "Đang tải…" : "Chưa có đánh giá ở mục này."}</h3><p>Khách đã mua hàng có thể đánh giá ở trang sản phẩm bằng mã đơn + số điện thoại. Đánh giá chỉ hiện sau khi bạn duyệt.</p></div> :
        <div className="order-cards">{shown.map((r) => (
          <article key={r.id} className={`order-card review-card ${r.status}`}>
            <header><div><strong>{r.productName}</strong><small>{r.name} · đơn {r.orderCode} · {new Date(r.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small></div><span className={`review-status ${r.status}`}>{LABEL[r.status] ?? r.status}</span></header>
            <div className="order-card-customer">
              <span className="stars" aria-label={`${r.rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={15} fill={i <= r.rating ? "currentColor" : "none"} />)}</span>
              <p>{r.content}</p>
              {r.photo && <a href={r.photo} target="_blank" rel="noreferrer"><img className="review-photo" src={r.photo} alt={`Ảnh khách ${r.name} chụp ${r.productName}`} loading="lazy" /></a>}
            </div>
            <footer>
              {r.status !== "approved" ? <button className="pay-toggle paid" disabled={working === r.id} onClick={() => setStatus(r, "approved")}><Check size={13} /> Duyệt & hiển thị</button>
                : <button className="pay-toggle" disabled={working === r.id} onClick={() => setStatus(r, "hidden")}><EyeOff size={13} /> Ẩn</button>}
              <button className="icon-btn danger" aria-label={`Xoá đánh giá của ${r.name}`} disabled={working === r.id} onClick={() => remove(r)}><Trash2 size={16} /></button>
            </footer>
          </article>
        ))}</div>}
    </section>
  </>;
}
