import { query } from "../../../../lib/db";
import { adminGuard, jsonError } from "../../../../lib/server";

export const dynamic = "force-dynamic";
const STATUSES = ["new", "contacted", "done"];

export async function GET(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const rows = await query("SELECT id,name,phone,address,product_name,quantity,note,created_at,status FROM leads ORDER BY created_at DESC LIMIT 300");
    return Response.json({ leads: rows.map((r) => ({ ...r, created_at: Number(r.created_at) })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return jsonError(e, 503); }
}

/** Update a request's status: new → contacted → done. */
export async function PATCH(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const x = await request.json() as { id?: string; status?: string };
    if (!x.id || !STATUSES.includes(String(x.status))) throw new Error("Trạng thái không hợp lệ.");
    const rows = await query("UPDATE leads SET status=$1 WHERE id=$2 RETURNING id", [x.status, x.id]);
    if (!rows.length) return Response.json({ error: "Không tìm thấy yêu cầu." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e) { return jsonError(e); }
}

export async function DELETE(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Mã yêu cầu không hợp lệ.");
    await query("DELETE FROM leads WHERE id=$1", [id]);
    return Response.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
