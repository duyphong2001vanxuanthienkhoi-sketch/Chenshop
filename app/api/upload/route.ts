import { adminGuard, jsonError } from "../../../lib/server";
import { MAX_IMAGE_BYTES, saveImage } from "../../../lib/media";

export async function POST(request: Request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 64 * 1024) throw new Error("Ảnh tối đa 4 MB.");
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) throw new Error("Chọn ảnh JPG, PNG hoặc WebP tối đa 4 MB.");
    return Response.json({ url: await saveImage(file, "products") }, { status: 201 });
  } catch (e) { return jsonError(e); }
}
