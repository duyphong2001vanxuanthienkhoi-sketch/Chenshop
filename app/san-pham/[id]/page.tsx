import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { query, queryOne } from "../../../lib/db";
import { rowProduct } from "../../../lib/server";
import { ensureCatalogImport } from "../../../lib/seed-catalog";
import { coverImage } from "../../../lib/photos";
import { productAlt, productPrice, productTags, type Product } from "../../../lib/catalog";
import { canOrder } from "../../../lib/shop";
import { siteUrl } from "../../../lib/site";
import ProductPage from "./product-page";

export const dynamic = "force-dynamic";

const loadProduct = cache(async (id: string) => {
  await ensureCatalogImport();
  const row = await queryOne("SELECT * FROM products WHERE id=$1 AND published=TRUE", [id]);
  return row ? (rowProduct(row) as Product) : null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await loadProduct((await params).id);
  if (!p) return { title: "Không tìm thấy sản phẩm" };
  const description = `${productAlt(p)} tại Chen Shop. ${productPrice(p)}. ${p.description.replace(/\s+/g, " ").slice(0, 120)}`;
  const image = coverImage(p.image);
  return {
    title: productAlt(p),
    description,
    alternates: { canonical: `/san-pham/${p.id}` },
    openGraph: { type: "website", title: productAlt(p), description, images: [{ url: image, alt: productAlt(p) }] },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await loadProduct(id);
  if (!product) notFound();
  const [shop, candidates, orderRows, ratingRow] = await Promise.all([
    queryOne<{ contact: string }>("SELECT contact FROM settings WHERE id='shop'"),
    query("SELECT * FROM products WHERE published=TRUE AND id<>$1 ORDER BY featured DESC, created_at DESC LIMIT 200", [id]),
    // orders that contain this product (items is a JSON snapshot)
    query("SELECT items FROM orders WHERE status<>'cancelled' AND items LIKE $1 ORDER BY created_at DESC LIMIT 200", [`%"id":${JSON.stringify(id)}%`]),
    queryOne<{ n: number; avg: number }>("SELECT COUNT(*)::int AS n, COALESCE(AVG(rating),0)::float AS avg FROM reviews WHERE product_id=$1 AND status='approved'", [id]),
  ]);
  const others = candidates.map((r) => rowProduct(r) as Product);
  const byId = new Map(others.map((o) => [o.id, o]));

  // "Thường được mua cùng": products that appear in the same orders, most frequent first.
  const together = new Map<string, number>();
  for (const o of orderRows) {
    let items: { id: string }[] = [];
    try { items = JSON.parse(String(o.items)); } catch {}
    for (const it of items) if (it.id !== id && byId.has(it.id)) together.set(it.id, (together.get(it.id) ?? 0) + 1);
  }
  const togetherList = [...together].sort((a, b) => b[1] - a[1]).map(([pid]) => byId.get(pid)!).filter((x) => canOrder(x)).slice(0, 4);

  // "Cùng chủ đề": same category, ranked by shared themes, buyable first.
  const tags = productTags(product), skip = new Set(togetherList.map((x) => x.id));
  const related = others
    .filter((o) => o.category === product.category && !skip.has(o.id))
    .map((o) => ({ o, score: productTags(o).filter((t) => tags.includes(t)).length * 10 + (canOrder(o) ? 3 : 0) + (o.featured ? 1 : 0) }))
    .sort((a, b) => b.score - a.score).slice(0, 4).map((x) => x.o);

  // Product structured data for Google (price, availability, rating).
  const base = siteUrl();
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org", "@type": "Product",
    name: productAlt(product), description: product.description.slice(0, 500), sku: product.id, brand: { "@type": "Brand", name: product.brand },
    image: [coverImage(product.image), ...(product.gallery ?? []).map((g) => g.url)].map((u) => (u.startsWith("http") ? u : base + u)).slice(0, 6),
    category: product.category, url: `${base}/san-pham/${product.id}`,
  };
  if (!product.pricePending) {
    ld.offers = { "@type": "Offer", priceCurrency: "VND", price: product.price, url: `${base}/san-pham/${product.id}`,
      availability: canOrder(product) ? (product.stockPending ? "https://schema.org/PreOrder" : "https://schema.org/InStock") : "https://schema.org/OutOfStock" };
  }
  if (ratingRow && Number(ratingRow.n) > 0) ld.aggregateRating = { "@type": "AggregateRating", ratingValue: Math.round(Number(ratingRow.avg) * 10) / 10, reviewCount: Number(ratingRow.n) };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    <ProductPage product={product} related={related} together={togetherList} contact={shop?.contact ?? ""} />
  </>;
}
