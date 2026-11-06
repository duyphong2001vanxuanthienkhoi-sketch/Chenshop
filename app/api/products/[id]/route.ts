import { query } from "../../../../lib/db";
import { adminGuard, validateProduct, jsonError } from "../../../../lib/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const { id } = await params, body = await request.json() as { updatedAt: number; createdAt: number }, p = validateProduct(body), now = Date.now();
    if (!Number.isSafeInteger(body.updatedAt)) throw new Error("Vui lòng tải lại sản phẩm trước khi lưu.");
    const updated = await query(
      "UPDATE products SET name=$1,brand=$2,category=$3,price=$4,compare_price=$5,stock=$6,description=$7,image=$8,image_slot=$9,published=$10,featured=$11,sample=$12,updated_at=$13,price_pending=$14,stock_pending=$15,gallery=$16 WHERE id=$17 AND updated_at=$18 RETURNING id",
      [p.name, p.brand, p.category, p.price, p.comparePrice, p.stock, p.description, p.image, p.imageSlot, p.published, p.featured, p.sample, now, p.pricePending, p.stockPending, JSON.stringify(p.gallery), id, body.updatedAt],
    );
    if (!updated.length) return Response.json({ error: "Sản phẩm đã thay đổi hoặc bị xóa ở nơi khác. Hãy tải lại trang để cập nhật." }, { status: 409 });
    return Response.json({ product: { ...p, id, createdAt: body.createdAt, updatedAt: now } });
  } catch (e) { return jsonError(e); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const { id } = await params;
    await query("DELETE FROM products WHERE id=$1", [id]);
    return Response.json({ ok: true });
  } catch (e) { return jsonError(e, 500); }
}
