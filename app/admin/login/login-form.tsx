"use client";
import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Logo } from "../../ui";

export default function LoginForm({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState(""), [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const x = await r.json().catch(() => ({})) as { error?: string };
      if (!r.ok) throw new Error(x.error ?? "Không thể đăng nhập.");
      window.location.replace("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đăng nhập.");
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <Logo />
        <div className="login-icon"><LockKeyhole size={26} /></div>
        <p className="eyebrow muted">CHEN SHOP / QUẢN TRỊ</p>
        <h1>Đăng nhập<span className="red-text">.</span></h1>
        <p className="login-lead">Khu vực dành riêng cho chủ shop để quản lý sản phẩm và yêu cầu của khách.</p>
        {!configured && (
          <div className="error-box" role="alert"><AlertCircle size={18} /><span>Chưa cấu hình mật khẩu quản trị. Thêm ADMIN_PASSWORD và ADMIN_SESSION_SECRET trong Vercel → Settings → Environment Variables rồi Redeploy.</span></div>
        )}
        <label>
          Mật khẩu quản trị
          <span className="password-field">
            <input type={show ? "text" : "password"} autoComplete="current-password" autoFocus required maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy || !configured} placeholder="Nhập mật khẩu" />
            <button type="button" className="icon-btn small" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShow(!show)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </span>
        </label>
        {error && <div className="error-box" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
        <button className="btn red full" type="submit" disabled={busy || !configured || !password}>{busy ? "ĐANG ĐĂNG NHẬP…" : "ĐĂNG NHẬP"}</button>
        <a className="text-button login-back" href="/"><ArrowLeft size={15} /> Quay lại cửa hàng</a>
      </form>
    </main>
  );
}
