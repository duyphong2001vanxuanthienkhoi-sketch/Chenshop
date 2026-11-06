import type { MetadataRoute } from "next";
import { query } from "../lib/db";
import { siteUrl } from "../lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages: MetadataRoute.Sitemap = ["", "/squishy", "/bean", "/figure", "/lien-he"].map((path) => ({
    url: base + path,
    changeFrequency: "daily",
    priority: path ? 0.8 : 1,
  }));
  try {
    const rows = await query<{ id: string; updated_at: number }>("SELECT id,updated_at FROM products WHERE published=TRUE ORDER BY updated_at DESC LIMIT 2000");
    for (const r of rows) pages.push({ url: `${base}/san-pham/${r.id}`, lastModified: new Date(Number(r.updated_at) || Date.now()), changeFrequency: "weekly", priority: 0.6 });
  } catch {
    // Database not ready yet: still return the static pages.
  }
  return pages;
}
