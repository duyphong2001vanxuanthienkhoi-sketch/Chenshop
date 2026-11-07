import { ArrowUpRight } from "lucide-react";
import { Logo } from "./ui";
import ThemeToggle from "./theme-toggle";

export default function NotFound() {
  return (
    <>
      <header className="site-header"><div className="nav-main"><Logo /><div className="header-actions"><a className="text-button" href="/">Về cửa hàng <ArrowUpRight size={15} /></a><ThemeToggle /></div></div></header>
      <main className="not-found section-wrap">
        <span className="eyebrow muted">404 / LẠC ĐƯỜNG MỘT CHÚT</span>
        <h1>Không tìm thấy trang<span className="red-text">.</span></h1>
        <p>Sản phẩm có thể đã được ẩn hoặc đường dẫn không còn đúng. Cùng quay lại bộ sưu tập nhé.</p>
        <div className="not-found-actions">
          <a className="btn red" href="/">VỀ TRANG CHỦ <ArrowUpRight size={17} /></a>
          <a className="btn outline" href="/squishy">XEM SQUISHY</a>
        </div>
      </main>
    </>
  );
}
