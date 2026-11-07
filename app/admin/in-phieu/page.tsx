import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "../../../lib/auth";
import { queryOne } from "../../../lib/db";
import { loadSettings, rowOrder } from "../../../lib/orders";
import { money } from "../../../lib/catalog";
import { SHIPPING_LABEL, shippingText } from "../../../lib/shop";
import { ZALO_PHONE } from "../../../lib/contact";
import PrintButton from "./print-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "In phiếu giao hàng", robots: { index: false, follow: false } };

/** Printable delivery slip (A5/A6) for one order. */
export default async function PrintSlip({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id = "" } = await searchParams;
  const row = /^[a-f0-9-]{36}$/.test(id) ? await queryOne("SELECT * FROM orders WHERE id=$1", [id]) : null;
  if (!row) return <main className="slip-page"><p>Không tìm thấy đơn hàng.</p></main>;
  const settings = await loadSettings();
  const o = rowOrder(row, settings);
  const codAmount = o.paymentMethod === "cod" && o.paymentStatus !== "paid" ? o.total : 0;
  return (
    <main className="slip-page">
      <div className="slip-actions"><PrintButton /><a className="btn outline" href="/admin">Về trang quản trị</a></div>
      <article className="slip">
        <header>
          <div><strong className="slip-brand">CHEN SHOP</strong><small>Art toys & little joys · Zalo {ZALO_PHONE}</small>{settings.contact && <small>{settings.contact}</small>}</div>
          <div className="slip-code"><span>MÃ ĐƠN</span><b>{o.code}</b><small>{new Date(o.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small></div>
        </header>
        <section className="slip-to">
          <span>NGƯỜI NHẬN</span>
          <b>{o.name}</b>
          <b>{o.phone}</b>
          <p>{o.address}</p>
          {o.note && <p className="slip-note">Ghi chú: {o.note}</p>}
        </section>
        <table>
          <thead><tr><th>Sản phẩm</th><th>SL</th><th>Thành tiền</th></tr></thead>
          <tbody>{o.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.qty}</td><td>{money(i.price * i.qty)}</td></tr>)}</tbody>
          <tfoot>
            <tr><td colSpan={2}>Tạm tính</td><td>{money(o.subtotal)}</td></tr>
            <tr><td colSpan={2}>{SHIPPING_LABEL[o.shippingMethod]}</td><td>{shippingText({ fee: o.shippingFee, mode: o.shippingMode }, money)}</td></tr>
            <tr className="slip-total"><td colSpan={2}>Tổng cộng</td><td>{money(o.total)}</td></tr>
          </tfoot>
        </table>
        <div className={`slip-cod ${codAmount ? "" : "paid"}`}>
          {codAmount ? <>THU HỘ (COD): <b>{money(codAmount)}</b></> : <>ĐÃ THANH TOÁN — KHÔNG THU TIỀN</>}
        </div>
        <footer>Cảm ơn bạn đã chọn Chen Shop. Kiểm tra hàng khi nhận; cần hỗ trợ nhắn Zalo {ZALO_PHONE}.</footer>
      </article>
    </main>
  );
}
