import { query } from "../../../lib/db";
import { adminGuard, rowProduct } from "../../../lib/server";
import { ensureCatalogImport } from "../../../lib/seed-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    await ensureCatalogImport();
    const rows = await query("SELECT * FROM products ORDER BY created_at DESC");
    return Response.json({ products: rows.map(rowProduct) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/admin", e);
    return Response.json({ error: "Không thể tải kho sản phẩm. Vui lòng thử lại." }, { status: 503 });
  }
}
