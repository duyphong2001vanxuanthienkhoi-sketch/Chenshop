import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { query, queryOne } from "../../../lib/db";
import { rowProduct } from "../../../lib/server";
import { ensureCatalogImport } from "../../../lib/seed-catalog";
import { coverImage } from "../../../lib/photos";
import { productPrice, type Product } from "../../../lib/catalog";
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
  const description = `${p.name} — ${p.category} tại Chen Shop. ${productPrice(p)}. ${p.description.replace(/\s+/g, " ").slice(0, 120)}`;
  const image = coverImage(p.image);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/san-pham/${p.id}` },
    openGraph: { type: "website", title: p.name, description, images: [{ url: image, alt: p.name }] },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await loadProduct(id);
  if (!product) notFound();
  const [shop, related] = await Promise.all([
    queryOne<{ contact: string }>("SELECT contact FROM settings WHERE id='shop'"),
    query("SELECT * FROM products WHERE category=$1 AND published=TRUE AND id<>$2 ORDER BY featured DESC, created_at DESC LIMIT 4", [product.category, id]),
  ]);
  return <ProductPage product={product} related={related.map((r) => rowProduct(r) as Product)} contact={shop?.contact ?? ""} />;
}
