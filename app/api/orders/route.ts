import { queryOne } from "../../../lib/db";
import { jsonError } from "../../../lib/server";
import { clientIp, hashText, sameOrigin } from "../../../lib/auth";
import { insertOrder, loadSettings, newOrderCode, priceOrder, rowOrder, validateOrder } from "../../../lib/orders";

export const dynamic = "force-dynamic";

/** Guest checkout: creates an order (COD or bank transfer) without an account. */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 20000) throw new Error("Thông tin gửi quá dài.");
    const body = await request.json() as any;
    if (body?.website) return Response.json({ error: "Không thể đặt hàng." }, { status: 400 }); // honeypot
    const input = validateOrder(body);
    const settings = await loadSettings();

    // Same checkout submitted twice (double tap, retry after a network error): return the first order.
    const existing = await queryOne("SELECT * FROM orders WHERE id=$1", [input.id]);
    if (existing) {
      if (String(existing.phone) !== input.phone) return Response.json({ error: "Phiên đặt hàng đã được dùng. Vui lòng tải lại trang." }, { status: 409 });
      return Response.json({ ok: true, order: rowOrder(existing, settings) });
    }

    const ipHash = await hashText("order|" + clientIp(request));
    const recent = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM orders WHERE ip_hash=$1 AND created_at>$2", [ipHash, Date.now() - 3600000]);
    if (Number(recent?.n ?? 0) >= 8) return Response.json({ error: "Bạn đã đặt nhiều đơn trong thời gian ngắn. Vui lòng nhắn Zalo để shop hỗ trợ." }, { status: 429 });

    const priced = await priceOrder(input, settings);
    let code = newOrderCode();
    try {
      await insertOrder(input, priced, code, ipHash);
    } catch (e) {
      if (!(e instanceof Error) || !/orders_code_key|duplicate key/i.test(e.message)) throw e;
      code = newOrderCode(); // extremely rare code collision: retry once
      await insertOrder(input, priced, code, ipHash);
    }
    const row = await queryOne("SELECT * FROM orders WHERE id=$1", [input.id]);
    if (!row) throw new Error("Chưa tạo được đơn hàng. Vui lòng thử lại.");
    return Response.json({ ok: true, order: rowOrder(row, settings) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("POST /api/orders", e);
    return jsonError(e);
  }
}
