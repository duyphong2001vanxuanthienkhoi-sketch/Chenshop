"use client";
import { useState, type FormEvent } from "react";
import { Check, Pencil, X } from "lucide-react";
import { money, productPrice, type Product } from "../../lib/catalog";

/** Inline price + stock editor in the product table (no need to open the full form). */
export default function QuickPrice({ product, onSaved }: { product: Product; onSaved: (p: Product) => void }) {
  const [open, setOpen] = useState(false), [price, setPrice] = useState(""), [stock, setStock] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  function start() {
    setPrice(product.pricePending ? "" : String(product.price));
    setStock(product.stockPending ? "" : String(product.stock));
    setError(""); setOpen(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const pr = Math.floor(Number(price));
    if (!Number.isFinite(pr) || pr <= 0) { setError("Nhập giá bán lớn hơn 0."); return; }
    const st = stock.trim() === "" ? null : Math.floor(Number(stock));
    if (st !== null && (!Number.isFinite(st) || st < 0)) { setError("Tồn kho là số ≥ 0."); return; }
    setBusy(true); setError("");
    try {
      const body = { ...product, price: pr, pricePending: false, comparePrice: product.comparePrice > pr ? product.comparePrice : 0, stock: st ?? 0, stockPending: st === null };
      const r = await fetch(`/api/products/${product.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const x = await r.json().catch(() => ({})) as { product?: Product; error?: string };
      if (!r.ok || !x.product) throw new Error(x.error ?? "Không lưu được.");
      onSaved(x.product); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Không lưu được."); } finally { setBusy(false); }
  }
  if (!open) return (
    <button type="button" className="quick-price" onClick={start} title="Sửa nhanh giá và tồn kho">
      <strong className={product.pricePending ? "pending-text" : ""}>{productPrice(product)}</strong>
      {product.comparePrice > product.price && !product.pricePending && <del>{money(product.comparePrice)}</del>}
      <Pencil size={12} />
    </button>
  );
  return (
    <form className="quick-price-form" onSubmit={save}>
      <label>Giá (đ)<input type="number" inputMode="numeric" min={1} step={1000} autoFocus value={price} onChange={(e) => setPrice(e.target.value)} placeholder="VD: 150000" disabled={busy} /></label>
      <label>Tồn kho<input type="number" inputMode="numeric" min={0} step={1} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Trống = chưa rõ" disabled={busy} /></label>
      <div><button type="submit" className="icon-btn" aria-label="Lưu giá" disabled={busy}><Check size={16} /></button><button type="button" className="icon-btn" aria-label="Huỷ" onClick={() => setOpen(false)} disabled={busy}><X size={16} /></button></div>
      {error && <small className="field-error">{error}</small>}
    </form>
  );
}
