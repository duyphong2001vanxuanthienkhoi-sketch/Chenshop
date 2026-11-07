import { query } from "../../../../lib/db";
import { adminGuard, jsonError } from "../../../../lib/server";
import { loadSettings, rowOrder } from "../../../../lib/orders";
import { ORDER_STATUS } from "../../../../lib/shop";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const [rows, settings] = await Promise.all([query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 300"), loadSettings()]);
    return Response.json({ orders: rows.map((r) => ({ id: String(r.id), email: String(r.email ?? ""), ...rowOrder(r, settings) })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return jsonError(e, 503); }
}

/**
 * { id, status } changes the order status. Cancelling puts tracked stock back, once
 * (a cancelled order cannot be reopened). { id, paymentStatus } marks paid / unpaid.
 */
export async function PATCH(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const x = await request.json() as { id?: string; status?: string; paymentStatus?: string };
    const id = String(x.id ?? ""), now = Date.now();
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Mã đơn không hợp lệ.");
    if (x.paymentStatus !== undefined) {
      if (!["paid", "unpaid"].includes(x.paymentStatus)) throw new Error("Trạng thái thanh toán không hợp lệ.");
      const rows = await query("UPDATE orders SET payment_status=$1, updated_at=$2 WHERE id=$3 RETURNING id", [x.paymentStatus, now, id]);
      if (!rows.length) return Response.json({ error: "Không tìm thấy đơn hàng." }, { status: 404 });
      return Response.json({ ok: true });
    }
    const status = String(x.status ?? "");
    if (!(status in ORDER_STATUS)) throw new Error("Trạng thái không hợp lệ.");
    if (status === "cancelled") {
      await query(
        `WITH o AS (
           UPDATE orders SET status='cancelled', updated_at=$2 WHERE id=$1 AND status<>'cancelled' RETURNING items
         ), it AS (
           SELECT e->>'id' AS id, SUM((e->>'qty')::int) AS qty
           FROM o, jsonb_array_elements(o.items::jsonb) e
           WHERE (e->>'tracked')::boolean GROUP BY 1
         )
         UPDATE products p SET stock = p.stock + it.qty, updated_at = $2
         FROM it WHERE p.id = it.id AND p.stock_pending = FALSE`,
        [id, now],
      );
    } else {
      const rows = await query("UPDATE orders SET status=$1, updated_at=$2 WHERE id=$3 AND status<>'cancelled' RETURNING id", [status, now, id]);
      if (!rows.length) return Response.json({ error: "Đơn đã huỷ không thể mở lại. Hãy tạo đơn mới nếu khách vẫn muốn mua." }, { status: 409 });
    }
    return Response.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
