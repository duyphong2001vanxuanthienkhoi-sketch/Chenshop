import { mkdir, writeFile } from "node:fs/promises";
import { put } from "@vercel/blob";
import { adminGuard, jsonError } from "../../../lib/server";

// Vercel limits a function request body to 4.5 MB. The admin page shrinks photos in the
// browser before uploading, so real files stay well below this.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) throw new Error("Ảnh tối đa 4 MB.");
    const form = await request.formData(), file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) throw new Error("Chọn ảnh JPG, PNG hoặc WebP tối đa 4 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!png && !jpg && !webp) throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ.");
    const ext = png ? "png" : jpg ? "jpg" : "webp", key = crypto.randomUUID() + "." + ext;
    const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`products/${key}`, Buffer.from(bytes), { access: "public", contentType, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
      return Response.json({ url: blob.url }, { status: 201 });
    }
    if (process.env.VERCEL) throw new Error("Kho ảnh chưa sẵn sàng. Hãy tạo Vercel Blob trong mục Storage của dự án.");
    // Local machine: keep uploads in .local-data/uploads and serve them through /api/media.
    await mkdir(process.cwd() + "/.local-data/uploads", { recursive: true });
    await writeFile(process.cwd() + "/.local-data/uploads/" + key, bytes);
    return Response.json({ url: "/api/media/" + key }, { status: 201 });
  } catch (e) { return jsonError(e); }
}
