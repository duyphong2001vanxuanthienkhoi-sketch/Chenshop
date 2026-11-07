"use client";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Camera, Check, PenLine, ShieldCheck, Star } from "lucide-react";
import { lastOrders } from "../../../lib/shop";

type Review = { id: string; name: string; rating: number; content: string; photo: string; createdAt: number };

async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext("2d"); if (!ctx) return file;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const enc = (t: string) => new Promise<Blob | null>((r) => c.toBlob(r, t, 0.85));
    let out = await enc("image/webp"); if (!out || out.type !== "image/webp") out = await enc("image/jpeg");
    return out ? new File([out], "review." + (out.type === "image/webp" ? "webp" : "jpg"), { type: out.type }) : file;
  } catch { return file; }
}

/** Ratings & reviews. Writing one needs the order code + phone of a purchase containing this product. */
export default function ProductReviews({ productId, productName, onSummary }: { productId: string; productName: string; onSummary: (s: { average: number; count: number }) => void }) {
  const [reviews, setReviews] = useState<Review[]>([]), [average, setAverage] = useState(0), [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5), [name, setName] = useState(""), [content, setContent] = useState(""), [code, setCode] = useState(""), [phone, setPhone] = useState(""), [photo, setPhoto] = useState<File | null>(null), [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [sent, setSent] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?product=${encodeURIComponent(productId)}`).then((r) => r.json()).then((x: { reviews: Review[]; average: number; count: number }) => {
      setReviews(x.reviews ?? []); setAverage(x.average ?? 0); onSummary({ average: x.average ?? 0, count: x.count ?? 0 });
    }).catch(() => {});
    const last = lastOrders()[0];
    if (last) { setCode(last.code); setPhone(last.phone); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData();
      Object.entries({ productId, rating: String(rating), name, content, code, phone, website }).forEach(([k, v]) => form.set(k, v));
      if (photo) form.set("photo", await shrink(photo));
      const r = await fetch("/api/reviews", { method: "POST", body: form });
      const x = await r.json().catch(() => ({})) as { error?: string };
      if (!r.ok) throw new Error(x.error ?? "Chưa gửi được đánh giá.");
      setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Chưa gửi được đánh giá."); } finally { setBusy(false); }
  }

  const dist = [5, 4, 3, 2, 1].map((s) => reviews.filter((r) => r.rating === s).length);
  return (
    <section className="reviews-section" id="danh-gia">
      <div className="section-top"><div><p className="eyebrow muted">REAL CUSTOMERS, REAL JOY</p><h2>Đánh giá từ khách đã mua<span className="red-text">.</span></h2></div>
        {!open && !sent && <button className="btn outline" onClick={() => setOpen(true)}><PenLine size={16} /> VIẾT ĐÁNH GIÁ</button>}</div>
      <div className="reviews-layout">
        <div className="reviews-summary">
          <strong>{reviews.length ? average.toFixed(1) : "—"}</strong>
          <span className="stars">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={16} fill={i <= Math.round(average) ? "currentColor" : "none"} />)}</span>
          <small>{reviews.length ? `${reviews.length} đánh giá đã xác minh` : "Chưa có đánh giá"}</small>
          {reviews.length > 0 && <ul className="rating-bars">{dist.map((n, i) => <li key={i}><span>{5 - i}★</span><i><b style={{ width: `${(n / reviews.length) * 100}%` }} /></i><span>{n}</span></li>)}</ul>}
          <p className="verified-note"><ShieldCheck size={14} /> Chỉ khách đã mua (có mã đơn) mới đánh giá được.</p>
        </div>
        <div className="reviews-list">
          {sent ? <div className="lead-success"><span><Check size={26} /></span><h3>Cảm ơn bạn!</h3><p>Đánh giá sẽ hiển thị sau khi Chen Shop duyệt.</p></div> : open && (
            <form className="review-form lead-form" onSubmit={submit}>
              <div className="star-input" role="radiogroup" aria-label="Số sao">
                {[1, 2, 3, 4, 5].map((i) => <button type="button" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} sao`} className={i <= rating ? "on" : ""} onClick={() => setRating(i)}><Star size={26} fill={i <= rating ? "currentColor" : "none"} /></button>)}
              </div>
              <label>Cảm nhận về {productName}<textarea required rows={3} maxLength={1500} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Độ mềm, độ nảy, mùi, đóng gói…" /></label>
              <div className="two-fields">
                <label>Tên hiển thị<input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Linh ở Hà Nội" /></label>
                <label className="photo-input">Ảnh thực tế <span>(không bắt buộc)</span>
                  <span className="btn outline"><Camera size={15} />{photo ? photo.name.slice(0, 18) : "CHỌN ẢNH"}<input className="sr-only" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></span>
                </label>
              </div>
              <div className="two-fields">
                <label>Mã đơn hàng<input required maxLength={16} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CS…" /></label>
                <label>Số điện thoại đặt hàng<input required type="tel" inputMode="tel" maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              </div>
              <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
              {error && <div className="error-box" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
              <div className="review-form-actions"><button className="btn red" type="submit" disabled={busy}>{busy ? "ĐANG GỬI…" : "GỬI ĐÁNH GIÁ"}</button><button type="button" className="text-button" onClick={() => setOpen(false)}>Huỷ</button></div>
            </form>
          )}
          {!reviews.length && !open && !sent && <p className="muted reviews-empty">Hãy là người đầu tiên chia sẻ cảm nhận sau khi nhận hàng.</p>}
          {reviews.map((r) => (
            <article key={r.id} className="review-item">
              <header><b>{r.name}</b><span className="stars" aria-label={`${r.rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} fill={i <= r.rating ? "currentColor" : "none"} />)}</span><small><ShieldCheck size={12} /> Đã mua · {new Date(r.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small></header>
              <p>{r.content}</p>
              {r.photo && <a href={r.photo} target="_blank" rel="noreferrer"><img className="review-photo" src={r.photo} alt={`Ảnh thực tế ${productName} của ${r.name}`} loading="lazy" /></a>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
