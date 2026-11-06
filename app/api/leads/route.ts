import { query, queryOne } from "../../../lib/db";
import { jsonError } from "../../../lib/server";
import { clientIp, hashText, sameOrigin } from "../../../lib/auth";
import { validateLead, syncLead, type LeadRow } from "../../../lib/leads";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 12000) throw new Error("Thông tin gửi quá dài.");
    const x = await request.json() as any;
    if (x.website) return Response.json({ ok: true, id: x.id }); // honeypot field filled → bot
    const p = validateLead(x);
    const existing = await queryOne<LeadRow>("SELECT * FROM leads WHERE id=$1", [p.id]);
    // Opaque request IDs prevent duplicate rows. Never return stored customer data.
    if (existing) {
      if (existing.phone !== p.phone) return Response.json({ error: "Mã gửi đã được sử dụng." }, { status: 409 });
      return Response.json({ ok: true, id: p.id, synced: await syncLead(existing) });
    }
    const ipHash = await hashText("lead|" + clientIp(request));
    const recent = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM leads WHERE ip_hash=$1 AND created_at>$2", [ipHash, Date.now() - 3600000]);
    if (Number(recent?.n ?? 0) >= 10) return Response.json({ error: "Bạn đã gửi nhiều yêu cầu. Vui lòng nhắn Zalo để shop hỗ trợ." }, { status: 429 });
    const product = p.productId ? await queryOne<{ id: string; name: string }>("SELECT id,name FROM products WHERE id=$1 AND published=TRUE", [p.productId]) : null;
    if (p.productId && !product) throw new Error("Sản phẩm không còn hiển thị. Vui lòng chọn lại.");
    const fromBag = !product && p.note.startsWith("ĐẶT HÀNG TỪ TÚI");
    const source = product ? "Chen Shop / sản phẩm" : fromBag ? "Chen Shop / túi hàng" : "Chen Shop / tư vấn", createdAt = Date.now();
    await query(
      "INSERT INTO leads (id,name,phone,address,product_id,product_name,quantity,note,source,consent,created_at,ip_hash,sync_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending') ON CONFLICT (id) DO NOTHING",
      [p.id, p.name, p.phone, p.address, product?.id ?? "", product?.name ?? (fromBag ? "Danh sách trong túi" : "Tư vấn chọn sản phẩm"), p.quantity, p.note, source, true, createdAt, ipHash],
    );
    const row = await queryOne<LeadRow>("SELECT * FROM leads WHERE id=$1", [p.id]);
    const synced = row ? await syncLead(row) : false;
    return Response.json({ ok: true, id: p.id, synced }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) { return jsonError(e); }
}
