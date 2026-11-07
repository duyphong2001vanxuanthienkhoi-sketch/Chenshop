"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { ProductImage } from "./ui";
import { THEMES, fold, productPrice, productTags, type Product } from "../lib/catalog";
import { canOrder } from "../lib/shop";

const HOT = ["Squishy", "Bánh", "Mèo", "Gấu", "Thỏ", "Matcha"];

/** Instant search: results with thumbnails as you type, plus suggested keywords. */
export default function SearchOverlay({ open, products, onClose, onSeeAll }: { open: boolean; products: Product[]; onClose: () => void; onSeeAll: (q: string) => void }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setTimeout(() => input.current?.focus(), 30);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const old = document.body.style.overflow; document.body.style.overflow = "hidden";
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = old; };
  }, [open, onClose]);

  const results = useMemo(() => {
    const words = fold(q.trim()).split(/\s+/).filter(Boolean);
    const list = products.filter((p) => p.published);
    if (!words.length) return list.filter((p) => canOrder(p)).slice(0, 6);
    return list
      .map((p) => ({ p, hay: fold(`${p.name} ${p.brand} ${p.category} ${productTags(p).join(" ")}`) }))
      .filter((x) => words.every((w) => x.hay.includes(w)))
      .sort((a, b) => Number(canOrder(b.p)) - Number(canOrder(a.p)) || Number(fold(b.p.name).startsWith(words[0])) - Number(fold(a.p.name).startsWith(words[0])))
      .slice(0, 8).map((x) => x.p);
  }, [q, products]);

  if (!open) return null;
  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Tìm sản phẩm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-panel">
        <form className="search-bar" onSubmit={(e) => { e.preventDefault(); onSeeAll(q); }}>
          <Search size={20} />
          <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm squishy, bánh, mèo, gấu…" aria-label="Từ khoá tìm kiếm" enterKeyHint="search" />
          <button type="button" className="icon-btn" aria-label="Đóng tìm kiếm" onClick={onClose}><X size={20} /></button>
        </form>
        <div className="search-hot">
          <span>{q ? "Chủ đề" : "Gợi ý"}</span>
          {(q ? THEMES : [...HOT, ...THEMES.slice(0, 3)]).map((k) => <button type="button" key={k} onClick={() => setQ(k)}>{k}</button>)}
        </div>
        <p className="search-caption">{q ? (results.length ? `Kết quả cho “${q}”` : `Chưa tìm thấy “${q}”. Thử từ khoá khác hoặc bỏ dấu.`) : "Đang có hàng"}</p>
        <ul className="search-results">
          {results.map((p) => (
            <li key={p.id}><a href={`/san-pham/${p.id}`}>
              <span className="search-thumb"><ProductImage product={p} /></span>
              <span className="search-info"><b>{p.name}</b><small>{p.category}{productTags(p).length ? ` · ${productTags(p).join(", ")}` : ""}</small></span>
              <span className="search-price">{productPrice(p)}</span>
            </a></li>
          ))}
        </ul>
        {q && results.length > 0 && <button type="button" className="btn outline full" onClick={() => onSeeAll(q)}>XEM TẤT CẢ KẾT QUẢ <ArrowUpRight size={16} /></button>}
      </div>
    </div>
  );
}
