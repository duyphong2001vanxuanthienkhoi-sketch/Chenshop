import { queryOne } from "../../../../lib/db";
import { loadSettings, normalizePhone, rowOrder } from "../../../../lib/orders";

export const dynamic = "force-dynamic";

/** Order tracking for guests: needs both the order code and the phone used at checkout. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").trim().toUpperCase();
  const phone = normalizePhone(url.searchParams.get("phone") ?? "");
  if (!/^CS\d{6}[A-Z0-9]{5}$/.test(code) || !/^0\d{9}$/.test(phone)) {
    return Response.json({ error: "Nhập mã đơn (dạng CS…) và số điện thoại đã dùng khi đặt hàng." }, { status: 400 });
  }
  try {
    const row = await queryOne("SELECT * FROM orders WHERE code=$1", [code]);
    if (!row || String(row.phone) !== phone) return Response.json({ error: "Không tìm thấy đơn hàng với mã và số điện thoại này." }, { status: 404 });
    return Response.json({ order: rowOrder(row, await loadSettings()) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Không thể tra cứu lúc này. Vui lòng thử lại." }, { status: 503 });
  }
}
