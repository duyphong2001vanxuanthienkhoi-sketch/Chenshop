import { query, queryOne } from "../../../lib/db";
import { jsonError } from "../../../lib/server";
import { sameOrigin } from "../../../lib/auth";
import { normalizePhone } from "../../../lib/orders";
import { MAX_IMAGE_BYTES, saveImage } from "../../../lib/media";

export const dynamic = "force-dynamic";

/** Approved reviews of one product, newest first, with the average rating. */
export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("product") ?? "";
  if (!productId || productId.length > 100) return Response.json({ reviews: [], average: 0, count: 0 });
  try {
    const rows = await query("SELECT id,name,rating,content,photo,created_at FROM reviews WHERE product_id=$1 AND status='approved' ORDER BY created_at DESC LIMIT 100", [productId]);
    const reviews = rows.map((r) => ({ id: String(r.id), name: String(r.name), rating: Number(r.rating), content: String(r.content), photo: String(r.photo), createdAt: Number(r.created_at) }));
    const average = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
    return Response.json({ reviews, average, count: reviews.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ reviews: [], average: 0, count: 0 });
  }
}

/**
 * Only buyers can review: the order code + phone must match an order that contains
 * this product. One review per product per order. Reviews wait for the shop's approval.
 */
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 128 * 1024) throw new Error("Ảnh tối đa 4 MB.");
    const form = await request.formData();
    if (String(form.get("website") ?? "")) return Response.json({ ok: true });
    const text = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
    const productId = text("productId", 100), code = text("code", 20).toUpperCase(), phone = normalizePhone(text("phone", 20)), name = text("name", 60), content = text("content", 1500);
    const rating = Number(form.get("rating"));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Vui lòng chọn số sao (1–5).");
    if (name.length < 2) throw new Error("Vui lòng nhập tên hiển thị.");
    if (content.length < 5) throw new Error("Hãy viết vài dòng cảm nhận về sản phẩm.");
    if (!/^CS\d{6}[A-Z0-9]{5}$/.test(code) || !/^0\d{9}$/.test(phone)) throw new Error("Nhập mã đơn và số điện thoại đã dùng khi mua hàng.");

    const order = await queryOne("SELECT phone,status,items FROM orders WHERE code=$1", [code]);
    if (!order || String(order.phone) !== phone) throw new Error("Không tìm thấy đơn hàng với mã và số điện thoại này.");
    if (order.status === "cancelled") throw new Error("Đơn hàng đã huỷ nên không thể đánh giá.");
    let items: { id: string }[] = [];
    try { items = JSON.parse(String(order.items)); } catch {}
    if (!items.some((i) => i.id === productId)) throw new Error("Đơn hàng này không có sản phẩm đang xem.");
    if (await queryOne("SELECT id FROM reviews WHERE order_code=$1 AND product_id=$2", [code, productId])) throw new Error("Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi. Cảm ơn bạn!");

    const file = form.get("photo");
    const photo = file instanceof File && file.size ? await saveImage(file, "reviews") : "";
    await query("INSERT INTO reviews (id,product_id,order_code,name,rating,content,photo,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8) ON CONFLICT (order_code, product_id) DO NOTHING",
      [crypto.randomUUID(), productId, code, name, rating, content, photo, Date.now()]);
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) { return jsonError(e); }
}
