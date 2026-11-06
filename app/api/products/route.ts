import { query, queryOne } from "../../../lib/db";
import { adminGuard, rowProduct, validateProduct, jsonError, PRODUCT_COLUMNS, productValues, placeholders } from "../../../lib/server";
import { ensureCatalogImport } from "../../../lib/seed-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureCatalogImport();
    const rows = await query("SELECT * FROM products WHERE published=TRUE ORDER BY featured DESC, created_at DESC");
    const count = await queryOne<{ total: number }>("SELECT COUNT(*)::int AS total FROM products");
    return Response.json({ products: rows.map(rowProduct), isEmpty: Number(count?.total ?? 0) === 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/products", e);
    return Response.json({ error: "Không thể tải sản phẩm. Vui lòng thử lại." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const p = validateProduct(await request.json()), id = crypto.randomUUID(), now = Date.now();
    await query(`INSERT INTO products (${PRODUCT_COLUMNS}) VALUES (${placeholders(18)})`, productValues(id, p, now, now));
    return Response.json({ product: { ...p, id, createdAt: now, updatedAt: now } }, { status: 201 });
  } catch (e) { return jsonError(e); }
}
