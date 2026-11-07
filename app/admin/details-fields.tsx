"use client";
import { useState } from "react";
import { Film, Upload, X } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { SLOW_RISE, THEMES, productTags, type ProductDetails } from "../../lib/catalog";

/** Extra product facts in the admin product form. */
export default function DetailsFields({ name, value, onChange, disabled }: { name: string; value: ProductDetails; onChange: (d: ProductDetails) => void; disabled: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const set = (patch: Partial<ProductDetails>) => onChange({ ...value, ...patch });
  const guessed = productTags({ name, details: {} });
  const tags = value.tags?.length ? value.tags : guessed;

  async function uploadVideo(file?: File) {
    if (!file) return;
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) { setError("Chọn video MP4, WebM hoặc MOV."); return; }
    if (file.size > 60 * 1024 * 1024) { setError("Video tối đa 60 MB. Nên quay 10–20 giây."); return; }
    setBusy(true); setError("");
    try {
      const ext = file.type === "video/quicktime" ? "mov" : file.type === "video/webm" ? "webm" : "mp4";
      const blob = await upload(`videos/clip.${ext}`, file, { access: "public", handleUploadUrl: "/api/upload/video", contentType: file.type });
      set({ video: blob.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được video.");
    } finally { setBusy(false); }
  }

  return (
    <fieldset className="details-fields" disabled={disabled}>
      <legend>Thông số & chủ đề <small>(hiện ở trang sản phẩm, giúp khách lọc)</small></legend>
      <div className="two-fields">
        <label>Kích thước<input maxLength={60} value={value.size ?? ""} onChange={(e) => set({ size: e.target.value })} placeholder="VD: 10 × 8 × 5 cm" /></label>
        <label>Chất liệu<input maxLength={80} value={value.material ?? ""} onChange={(e) => set({ material: e.target.value })} placeholder="VD: Mút PU mềm" list="materials" />
          <datalist id="materials"><option>Mút PU mềm (foam)</option><option>Silicon dẻo</option><option>Nhựa vinyl</option><option>Vải bông</option></datalist>
        </label>
      </div>
      <div className="two-fields">
        <label>Độ chậm nở (slow-rising)<select value={value.slowRise ?? 0} onChange={(e) => set({ slowRise: Number(e.target.value) || undefined })}>
          <option value={0}>Không ghi</option>{SLOW_RISE.slice(1).map((t, i) => <option key={t} value={i + 1}>{i + 1}/5 — {t}</option>)}
        </select></label>
        <label>Mùi hương<input maxLength={60} value={value.scent ?? ""} onChange={(e) => set({ scent: e.target.value })} placeholder="VD: Vani nhẹ, không mùi" /></label>
      </div>
      <div className="theme-picker">
        <span>Chủ đề {value.tags?.length ? "" : <small>(đang tự đoán theo tên — bấm để chọn lại)</small>}</span>
        <div>{THEMES.map((t) => {
          const on = tags.includes(t);
          return <button type="button" key={t} className={on ? "on" : ""} aria-pressed={on} onClick={() => set({ tags: on ? tags.filter((x) => x !== t) : [...tags, t] })}>{t}</button>;
        })}</div>
      </div>
      <label>Video trải nghiệm (độ nảy, độ mềm)
        <span className="video-field">
          <input type="url" maxLength={300} value={value.video ?? ""} onChange={(e) => set({ video: e.target.value.trim() || undefined })} placeholder="Dán link YouTube / TikTok, hoặc tải video lên" />
          {value.video && <button type="button" className="icon-btn small" aria-label="Xoá video" onClick={() => set({ video: undefined })}><X size={15} /></button>}
        </span>
      </label>
      <div className="video-upload-row">
        <label className={`btn outline ${busy ? "is-busy" : ""}`}>
          {busy ? <Film size={15} /> : <Upload size={15} />}{busy ? "ĐANG TẢI VIDEO…" : "TẢI VIDEO LÊN"}
          <input className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy || disabled} onChange={(e) => { uploadVideo(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <small>MP4/MOV tối đa 60 MB, nên 10–20 giây. Video tải lên chỉ hoạt động trên bản đã deploy.</small>
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}
