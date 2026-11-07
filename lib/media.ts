import { mkdir, writeFile } from "node:fs/promises";
import { put } from "@vercel/blob";

// Vercel limits a function request body to 4.5 MB; pages shrink photos in the browser first.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Checks the file really is a JPG/PNG/WebP (by its first bytes) and stores it. */
export async function saveImage(file: File, folder: "products" | "reviews"): Promise<string> {
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error("Ảnh JPG, PNG hoặc WebP tối đa 4 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!png && !jpg && !webp) throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ.");
  const ext = png ? "png" : jpg ? "jpg" : "webp", key = crypto.randomUUID() + "." + ext;
  const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${key}`, Buffer.from(bytes), { access: "public", contentType, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error("Kho ảnh chưa sẵn sàng. Hãy tạo Vercel Blob trong mục Storage của dự án.");
  // Local machine: keep uploads in .local-data/uploads and serve them through /api/media.
  await mkdir(process.cwd() + "/.local-data/uploads", { recursive: true });
  await writeFile(process.cwd() + "/.local-data/uploads/" + key, bytes);
  return "/api/media/" + key;
}
