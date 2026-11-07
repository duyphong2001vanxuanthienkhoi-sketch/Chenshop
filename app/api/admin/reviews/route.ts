import { query } from "../../../../lib/db";
import { adminGuard, jsonError } from "../../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const rows = await query(
      `SELECT r.*, p.name AS product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id
       ORDER BY (r.status='pending') DESC, r.created_at DESC LIMIT 300`);
    return Response.json({ reviews: rows.map((r) => ({
      id: String(r.id), productId: String(r.product_id), productName: String(r.product_name ?? "Sản phẩm đã xoá"), orderCode: String(r.order_code),
      name: String(r.name), rating: Number(r.rating), content: String(r.content), photo: String(r.photo), status: String(r.status), createdAt: Number(r.created_at),
    })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return jsonError(e, 503); }
}

export async function PATCH(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const x = await request.json() as { id?: string; status?: string };
    if (!x.id || !["approved", "hidden", "pending"].includes(String(x.status))) throw new Error("Trạng thái không hợp lệ.");
    const rows = await query("UPDATE reviews SET status=$1 WHERE id=$2 RETURNING id", [x.status, x.id]);
    if (!rows.length) return Response.json({ error: "Không tìm thấy đánh giá." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) { return jsonError(e); }
}

export async function DELETE(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Mã đánh giá không hợp lệ.");
    await query("DELETE FROM reviews WHERE id=$1", [id]);
    return Response.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
