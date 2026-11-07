import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "../../../../lib/auth";

// Short product clips (squish / slow-rise demos) go straight from the admin's browser to
// Vercel Blob, so they are not limited by the 4.5 MB function body size. This route only
// hands out a one-time upload token to the logged-in shop owner.
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Tải video cần Vercel Blob (chỉ dùng được trên bản đã deploy). Bạn có thể dán link YouTube/TikTok." }, { status: 400 });
  }
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) throw new Error("Vui lòng đăng nhập quản trị.");
        if (!/^videos\/[A-Za-z0-9._-]+\.(mp4|webm|mov)$/.test(pathname)) throw new Error("Chỉ nhận video MP4, WebM hoặc MOV.");
        return { allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime"], maximumSizeInBytes: 60 * 1024 * 1024, addRandomSuffix: true, cacheControlMaxAge: 31536000 };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Không tải được video." }, { status: 400 });
  }
}
