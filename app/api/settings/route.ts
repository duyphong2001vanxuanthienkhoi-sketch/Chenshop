import { query, queryOne } from "../../../lib/db";
import { adminGuard, jsonError } from "../../../lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await queryOne<{ contact: string; instagram: string }>("SELECT contact,instagram FROM settings WHERE id='shop'");
    return Response.json(row ?? { contact: "", instagram: "" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Không thể tải thông tin cửa hàng." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const x = await request.json() as { contact?: unknown; instagram?: unknown }, contact = String(x.contact ?? "").trim(), instagram = String(x.instagram ?? "").trim();
    if (contact.length > 150) throw new Error("Thông tin liên hệ tối đa 150 ký tự.");
    if (instagram && !/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._/]+$/.test(instagram)) throw new Error("Vui lòng dùng đường dẫn Instagram hợp lệ bắt đầu bằng https://instagram.com/.");
    await query("INSERT INTO settings (id,contact,instagram) VALUES ('shop',$1,$2) ON CONFLICT (id) DO UPDATE SET contact=EXCLUDED.contact,instagram=EXCLUDED.instagram", [contact, instagram]);
    return Response.json({ contact, instagram });
  } catch (e) { return jsonError(e); }
}
