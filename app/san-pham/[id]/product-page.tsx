"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Heart, Image, Package, ShoppingBag, Star } from "lucide-react";
import { Logo, ProductImage } from "../../ui";
import Gallery from "../../gallery";
import LeadForm from "../../lead-form";
import ProductVideo from "./product-video";
import ProductReviews from "./reviews";
import ThemeToggle from "../../theme-toggle";
import { ZALO_URL } from "../../../lib/contact";
import { SLOW_RISE, categoryPath, productPrice, productStock, productTags, type Product } from "../../../lib/catalog";
import { bagCount, canOrder, maxOrderQty, readBag, writeBag } from "../../../lib/shop";

const LIKES_KEY = "chen-likes";
const readLikes = (): string[] => { try { const v = JSON.parse(localStorage.getItem(LIKES_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };

function MiniCard({ r }: { r: Product }) {
  return (
    <a className="product-card" href={"/san-pham/" + r.id}>
      <div className="product-visual"><ProductImage product={r} /><span className="product-badge">{r.pricePending ? "SẮP VỀ HÀNG" : r.category.toUpperCase()}</span></div>
      <div className="product-meta"><div><p className="product-brand">{r.brand}</p><h3 className="product-title">{r.name}</h3><div className="prices"><strong>{productPrice(r)}</strong></div></div><ArrowUpRight size={16} /></div>
    </a>
  );
}

export default function ProductPage({ product: p, related, together, contact }: { product: Product; related: Product[]; together: Product[]; contact: string }) {
  const [added, setAdded] = useState(false), [count, setCount] = useState(0), [liked, setLiked] = useState(false), [rating, setRating] = useState({ average: 0, count: 0 });
  useEffect(() => {
    const sync = () => setCount(bagCount(readBag()));
    sync(); setLiked(readLikes().includes(p.id));
    window.addEventListener("chen-bag", sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener("chen-bag", sync); window.removeEventListener("storage", sync); };
  }, [p.id]);
  function add() { const bag = readBag(); if ((bag[p.id] ?? 0) < maxOrderQty(p)) bag[p.id] = (bag[p.id] ?? 0) + 1; writeBag(bag); setAdded(true); }
  function toggleLike() {
    const likes = readLikes(), next = likes.includes(p.id) ? likes.filter((x) => x !== p.id) : [...likes, p.id];
    try { localStorage.setItem(LIKES_KEY, JSON.stringify(next)); } catch {}
    setLiked(next.includes(p.id));
  }
  const available = canOrder(p) && !p.sample;
  const d = p.details ?? {}, tags = productTags(p);
  const specs: [string, React.ReactNode][] = [];
  if (d.size) specs.push(["Kích thước", d.size]);
  if (d.material) specs.push(["Chất liệu", d.material]);
  if (d.slowRise) specs.push(["Độ chậm nở", <span className="rise-meter" key="rise" aria-label={`${d.slowRise} trên 5: ${SLOW_RISE[d.slowRise]}`}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= d.slowRise! ? "on" : ""} />)}<small>{SLOW_RISE[d.slowRise]}</small></span>]);
  if (d.scent) specs.push(["Mùi hương", d.scent]);
  specs.push(["Danh mục", <a key="cat" href={categoryPath(p.category)}>{p.category}</a>]);
  if (tags.length) specs.push(["Chủ đề", <span className="spec-tags" key="tags">{tags.map((t) => <a key={t} href={`${categoryPath(p.category)}?chu-de=${encodeURIComponent(t)}`}>{t}</a>)}</span>]);

  return <>
    <div className="announcement"><span>CHEN SHOP — COLLECT WHAT YOU LOVE</span><span className="announcement-right">Every little thing tells a story.</span></div>
    <header className="site-header"><div className="nav-main"><Logo /><nav className="product-page-nav"><a href="/bean">BEAN</a><a href="/figure">FIGURE</a><a href="/squishy">SQUISHY</a></nav><a href="/lien-he" className="text-button">Liên hệ <ArrowUpRight size={15} /></a><ThemeToggle /><a href="/thanh-toan" className="icon-btn bag-icon" aria-label={`Túi hàng, ${count} sản phẩm`}><ShoppingBag size={21} />{count > 0 && <b key={count}>{count}</b>}</a></div></header>
    <main className="product-page section-wrap">
      <div className="product-breadcrumb"><a href="/">Chen Shop</a><span>/</span><a href={categoryPath(p.category)}>{p.category}</a><span>/</span><span>{p.name}</span></div>
      <div className="product-page-grid">
        <div className="product-media"><Gallery product={p} />{d.video && <ProductVideo url={d.video} title={p.name} />}</div>
        <div className="product-page-info">
          <div className="product-title-row">
            <div><p className="eyebrow muted">{p.brand} / {p.category}</p><h1>{p.name}</h1></div>
            <button type="button" className={`heart-btn page-heart ${liked ? "liked" : ""}`} aria-pressed={liked} aria-label={liked ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"} onClick={toggleLike}><Heart size={20} fill={liked ? "currentColor" : "none"} /></button>
          </div>
          {rating.count > 0 && <a className="rating-line" href="#danh-gia"><span className="stars">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill={i <= Math.round(rating.average) ? "currentColor" : "none"} />)}</span>{rating.average.toFixed(1)} · {rating.count} đánh giá</a>}
          <div className="product-page-price">{productPrice(p)}</div>
          <p className={`stock-note ${p.pricePending ? "pending" : p.stockPending ? "pending" : p.stock > 0 ? "" : "out"}`}>{p.pricePending ? "Sắp về hàng — nhắn shop để được báo khi có giá" : productStock(p)}</p>
          <div className="product-page-line" />
          <p className="description">{p.description}</p>
          <dl className="spec-list">{specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {p.pricePending && <p className="inline-notice">Mẫu này sắp về hàng. Nhắn Zalo hoặc để lại thông tin, shop báo giá ngay khi có.</p>}
          <div className="buy-buttons">
            <button className="btn red full" disabled={!available} onClick={add}>{added ? <Check size={18} /> : <ShoppingBag size={18} />}{added ? "ĐÃ THÊM VÀO TÚI" : p.pricePending ? "SẮP VỀ HÀNG" : available ? "THÊM VÀO TÚI" : "TẠM HẾT HÀNG"}</button>
            {available && <a className="btn outline full" href="/thanh-toan" onClick={() => { if (!added) add(); }}>MUA NGAY</a>}
          </div>
          {added && <a className="text-button added-link" href="/thanh-toan">Xem túi hàng & thanh toán ({count}) <ArrowRight size={15} /></a>}
          {available && p.stockPending && <p className="inline-notice">Shop sẽ gọi xác nhận còn hàng trước khi giao. Mỗi đơn đặt tối đa {maxOrderQty(p)} sản phẩm này.</p>}
          {contact && <div className="product-contact"><span>LIÊN HỆ CHEN SHOP</span><p>{contact}</p></div>}
          <div className="product-direct-actions"><a className="btn zalo-inline" href={ZALO_URL} target="_blank" rel="noreferrer">NHẮN ZALO CHO CHEN <ArrowUpRight size={17} /></a><a href="#tu-van-san-pham" className="text-button">Để lại thông tin tư vấn <ArrowRight size={15} /></a></div>
          <div className="product-assurances"><span><Image size={16} />Ảnh thật từ shop</span><span><Package size={16} />Mỗi mẫu là một sản phẩm riêng</span></div>
          <a className="product-back text-button" href={categoryPath(p.category)}><ArrowLeft size={15} /> Quay lại {p.category}</a>
        </div>
      </div>

      <ProductReviews productId={p.id} productName={p.name} onSummary={setRating} />

      {together.length > 0 && (
        <section className="related-section">
          <div className="section-top"><div><p className="eyebrow muted">FREQUENTLY BOUGHT TOGETHER</p><h2>Thường được mua cùng<span className="red-text">.</span></h2></div></div>
          <div className="product-grid">{together.map((r) => <MiniCard key={r.id} r={r} />)}</div>
        </section>
      )}

      <section id="tu-van-san-pham" className="product-lead-section"><LeadForm productId={p.id} productName={p.name} /></section>

      {related.length > 0 && (
        <section className="related-section">
          <div className="section-top"><div><p className="eyebrow muted">MORE LITTLE JOYS</p><h2>{tags.length ? `Cùng chủ đề ${tags[0].toLowerCase()}` : "Có thể bạn cũng thích"}<span className="red-text">.</span></h2></div><a className="text-button" href={categoryPath(p.category)}>Xem tất cả <ArrowUpRight size={16} /></a></div>
          <div className="product-grid">{related.map((r) => <MiniCard key={r.id} r={r} />)}</div>
        </section>
      )}
    </main>
    <footer className="product-page-footer"><Logo dark /><p>Little things. Lasting joy.</p><a href="/">Khám phá Chen Shop <ArrowRight size={15} /></a></footer>
  </>;
}
