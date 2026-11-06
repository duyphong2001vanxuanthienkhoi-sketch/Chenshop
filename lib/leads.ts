import { query } from "./db";

export type LeadRow = { id: string; name: string; phone: string; address: string; product_id: string; product_name: string; quantity: number; note: string; source: string; consent: boolean; created_at: number; sync_status: string };

export function safeText(value: unknown, max: number) { return String(value ?? "").trim().slice(0, max); }

export function validateLead(x: any) {
  if (!x || typeof x !== "object") throw new Error("Thông tin không hợp lệ.");
  const id = safeText(x.id, 80), name = safeText(x.name, 100), phone = safeText(x.phone, 24).replace(/[\s.()-]/g, ""), address = safeText(x.address, 400), productId = safeText(x.productId, 100), note = safeText(x.note, 1500);
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Mã gửi không hợp lệ. Vui lòng tải lại trang.");
  if (name.length < 2) throw new Error("Vui lòng nhập họ tên từ 2 ký tự.");
  if (!/^(0[35789]\d{8}|\+?84[35789]\d{8})$/.test(phone)) throw new Error("Vui lòng nhập số điện thoại Việt Nam hợp lệ.");
  if (!Number.isInteger(x.quantity) || x.quantity < 1 || x.quantity > 99) throw new Error("Số lượng cần từ 1–99.");
  if (x.consent !== true) throw new Error("Vui lòng đồng ý để Chen Shop liên hệ theo thông tin đã gửi.");
  return { id, name, phone, address, productId, quantity: x.quantity as number, note };
}

export function validWebhook(url: string) { return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url); }

/**
 * Google Sheets sync is paused at the shop owner's request (see integrations/chen-sheets.gs).
 * To turn it on: set SHEETS_WEBHOOK_URL and SHEETS_WEBHOOK_SECRET on Vercel.
 */
export async function syncLead(row: LeadRow): Promise<boolean> {
  const endpoint = process.env.SHEETS_WEBHOOK_URL ?? "", token = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (row.sync_status === "synced") return true;
  if (!validWebhook(endpoint) || !token) return false;
  try {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, id: row.id, createdAt: Number(row.created_at), name: row.name, phone: row.phone, address: row.address, productId: row.product_id, productName: row.product_name, quantity: row.quantity, note: row.note, source: row.source, consent: !!row.consent }), signal: AbortSignal.timeout(15000) });
    const result = await res.json() as { ok?: boolean; id?: string };
    if (!res.ok || !result.ok || result.id !== row.id) return false;
    await query("UPDATE leads SET sync_status='synced',synced_at=$1 WHERE id=$2", [Date.now(), row.id]);
    return true;
  } catch { return false; }
}
