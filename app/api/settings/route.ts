import { query } from "../../../lib/db";
import { adminGuard, jsonError } from "../../../lib/server";
import { loadSettings, validateSettings } from "../../../lib/orders";

export const dynamic = "force-dynamic";

// Public: contact line, Instagram, shipping price and bank details for transfers.
export async function GET() {
  try {
    return Response.json(await loadSettings(), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Không thể tải thông tin cửa hàng." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const x = await request.json() as Record<string, unknown>, contact = String(x.contact ?? "").trim(), instagram = String(x.instagram ?? "").trim();
    if (contact.length > 150) throw new Error("Thông tin liên hệ tối đa 150 ký tự.");
    if (instagram && !/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._/]+$/.test(instagram)) throw new Error("Vui lòng dùng đường dẫn Instagram hợp lệ bắt đầu bằng https://instagram.com/.");
    const pay = validateSettings(x);
    await query(
      `INSERT INTO settings (id,contact,instagram,bank_bin,bank_account,bank_holder,shipping_fee,free_ship_over,express_fee) VALUES ('shop',$1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET contact=EXCLUDED.contact,instagram=EXCLUDED.instagram,bank_bin=EXCLUDED.bank_bin,bank_account=EXCLUDED.bank_account,bank_holder=EXCLUDED.bank_holder,shipping_fee=EXCLUDED.shipping_fee,free_ship_over=EXCLUDED.free_ship_over,express_fee=EXCLUDED.express_fee`,
      [contact, instagram, pay.bankBin, pay.bankAccount, pay.bankHolder, pay.shippingFee, pay.freeShipOver, pay.expressFee],
    );
    return Response.json({ contact, instagram, ...pay });
  } catch (e) { return jsonError(e); }
}
