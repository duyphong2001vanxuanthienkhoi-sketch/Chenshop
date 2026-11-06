import { readFile } from "node:fs/promises";

// Serves photos uploaded while running on a local machine (without Vercel Blob).
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
  try {
    const file = await readFile(process.cwd() + "/.local-data/uploads/" + key);
    const ext = key.split(".").pop();
    return new Response(file, { headers: { "Content-Type": `image/${ext === "jpg" ? "jpeg" : ext}`, "Cache-Control": "public,max-age=31536000,immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
