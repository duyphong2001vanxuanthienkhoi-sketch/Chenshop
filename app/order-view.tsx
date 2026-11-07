"use client";
import { useState } from "react";
import { Check, Copy, Landmark, Truck } from "lucide-react";
import { money } from "../lib/catalog";
import { ORDER_STATUS, SHIPPING_LABEL, shippingText, vietQrUrl, type PublicOrder } from "../lib/shop";

const STEPS = ["new", "confirmed", "shipping", "done"];

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="copy-chip" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch {} }}>
      {done ? <Check size={13} /> : <Copy size={13} />}{done ? "Đã chép" : label}
    </button>
  );
}

/** Order summary + payment instructions, used after checkout and on the tracking page. */
export default function OrderView({ order }: { order: PublicOrder }) {
  const cancelled = order.status === "cancelled";
  const step = STEPS.indexOf(order.status);
  const showTransfer = order.paymentMethod === "bank" && order.paymentStatus === "unpaid" && !cancelled && order.bank;
  return (
    <div className="order-view">
      <div className="order-head">
        <div>
          <span className="eyebrow muted">MÃ ĐƠN HÀNG</span>
          <strong className="order-code">{order.code}</strong>
          <small>Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small>
        </div>
        <CopyButton value={order.code} label="Chép mã" />
      </div>

      {cancelled ? <p className="order-cancelled">Đơn hàng đã được huỷ.</p> : (
        <ol className="order-steps">{STEPS.map((s, i) => <li key={s} className={i <= step ? "done" : ""}><span>{i + 1}</span>{ORDER_STATUS[s]}</li>)}</ol>
      )}

      {showTransfer && order.bank && (
        <section className="transfer-box">
          <h3><Landmark size={17} /> Chuyển khoản để hoàn tất đơn</h3>
          <div className="transfer-grid">
            <img src={vietQrUrl({ bankBin: order.bank.bin, bankAccount: order.bank.account, bankHolder: order.bank.holder }, order.total, order.code)} alt={`Mã VietQR chuyển ${money(order.total)} cho đơn ${order.code}`} width={240} height={240} loading="lazy" />
            <dl>
              <div><dt>Ngân hàng</dt><dd>{order.bank.name}</dd></div>
              <div><dt>Số tài khoản</dt><dd>{order.bank.account} <CopyButton value={order.bank.account} label="Chép" /></dd></div>
              <div><dt>Chủ tài khoản</dt><dd>{order.bank.holder}</dd></div>
              <div><dt>Số tiền</dt><dd className="transfer-amount">{money(order.total)} <CopyButton value={String(order.total)} label="Chép" /></dd></div>
              <div><dt>Nội dung</dt><dd><b>{order.code}</b> <CopyButton value={order.code} label="Chép" /></dd></div>
            </dl>
          </div>
          <p>Mở app ngân hàng → quét mã QR (số tiền và nội dung đã điền sẵn). Shop kiểm tra và xác nhận đơn trong giờ làm việc.</p>
        </section>
      )}
      {order.paymentMethod === "bank" && order.paymentStatus === "paid" && !cancelled && <p className="order-paid"><Check size={16} /> Shop đã nhận thanh toán.</p>}
      {order.paymentMethod === "cod" && !cancelled && (
        <p className="order-cod"><Truck size={17} /> Thanh toán <b>{money(order.total)}</b> khi nhận hàng. Shop sẽ gọi <b>{order.phone}</b> để xác nhận đơn{order.shippingMode === "phone" ? " và báo phí giao hàng" : ""}.</p>
      )}

      <div className="order-lines">
        {order.items.map((i) => (
          <div key={i.id} className="order-line"><span>{i.name} <small>× {i.qty}</small></span><b>{money(i.price * i.qty)}</b></div>
        ))}
        <div className="order-line muted"><span>Tạm tính</span><span>{money(order.subtotal)}</span></div>
        <div className="order-line muted"><span>{SHIPPING_LABEL[order.shippingMethod]}</span><span>{shippingText({ fee: order.shippingFee, mode: order.shippingMode }, money)}</span></div>
        <div className="order-line total"><span>Tổng cộng</span><b>{money(order.total)}</b></div>
      </div>
      <div className="order-ship">
        <span className="eyebrow muted">GIAO ĐẾN</span>
        <p><b>{order.name}</b> · {order.phone}</p>
        <p>{order.address}</p>
        {order.note && <p className="muted">Ghi chú: {order.note}</p>}
        <p className="muted">Thanh toán: {order.paymentMethod === "bank" ? "Chuyển khoản" : "Khi nhận hàng (COD)"}</p>
      </div>
    </div>
  );
}
