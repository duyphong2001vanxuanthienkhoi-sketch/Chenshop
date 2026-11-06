"use client";
import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Smartphone } from "lucide-react";
import { Modal } from "./ui";
import { ZALO_PHONE, ZALO_URL } from "../lib/contact";

// Every "Nhắn Zalo" link on the site points at https://zalo.me/<phone>. This handler
// makes that link behave well everywhere:
// - Phones/tablets: open the Zalo app directly with the same deep link zalo.me uses,
//   staying on this page (no blank tab left behind). If the app does not open within
//   ~1.6s (not installed, or blocked by an in-app browser), fall back to zalo.me,
//   which sends the visitor to the App Store / Google Play.
// - Computers: zalo.me shows a Zalo login page that looks like an error, so the shop's
//   own link opens a small dialog instead: QR code to scan with the phone, copy number,
//   or open Zalo PC / Zalo Web.
const ZALO_LINK = /^https:\/\/zalo\.me\/(0\d{9})\/?$/;

function isMobile() {
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function openZaloApp(phone: string, fallback: string) {
  const android = /Android/i.test(navigator.userAgent);
  const deepLink = android ? `zalo://zaloapp.com/qr/link/${phone}` : `zalo://qr/link/${phone}`;
  let left = false;
  const onHide = () => { if (document.hidden) left = true; };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  window.location.href = deepLink;
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (!left && !document.hidden) window.location.href = fallback;
  }, 1600);
}

export default function ZaloHandler() {
  const [open, setOpen] = useState(false), [copied, setCopied] = useState(false);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      const match = link?.href.match(ZALO_LINK);
      if (!link || !match || link.hasAttribute("data-zalo-direct")) return;
      if (isMobile()) {
        e.preventDefault();
        openZaloApp(match[1], link.href);
      } else if (link.href.replace(/\/$/, "") === ZALO_URL) {
        e.preventDefault();
        setCopied(false);
        setOpen(true);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function copy() {
    try { await navigator.clipboard.writeText(ZALO_PHONE.replace(/\D/g, "")); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Nhắn Zalo cho Chen Shop">
      <div className="zalo-dialog">
        <img className="zalo-qr" src="/images/zalo-qr.svg" alt={`Mã QR Zalo Chen Shop ${ZALO_PHONE}`} width={200} height={200} />
        <p className="zalo-dialog-lead"><Smartphone size={16} /><span>Mở <strong>Zalo trên điện thoại</strong> → biểu tượng quét mã QR → quét mã này để nhắn ngay cho shop.</span></p>
        <div className="zalo-dialog-phone">
          <span>Số Zalo</span>
          <strong>{ZALO_PHONE}</strong>
          <button type="button" className="btn outline" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "ĐÃ SAO CHÉP" : "SAO CHÉP SỐ"}</button>
        </div>
        <a className="btn zalo-inline" href={ZALO_URL} target="_blank" rel="noreferrer" data-zalo-direct onClick={(e) => e.stopPropagation()}>MỞ ZALO TRÊN MÁY TÍNH <ExternalLink size={15} /></a>
        <p className="zalo-dialog-note">Nếu trình duyệt hiện trang đăng nhập Zalo, hãy đăng nhập Zalo Web (hoặc mở ứng dụng Zalo PC) rồi tìm số {ZALO_PHONE}.</p>
      </div>
    </Modal>
  );
}
