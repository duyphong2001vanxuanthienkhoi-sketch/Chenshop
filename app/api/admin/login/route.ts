import { cookies } from "next/headers";
import { query, queryOne } from "../../../../lib/db";
import { authConfigured, checkPassword, clientIp, createSessionToken, hashText, sameOrigin, SESSION_COOKIE, SESSION_MAX_AGE } from "../../../../lib/auth";

const WINDOW_MS = 15 * 60 * 1000, MAX_FAILURES = 8;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  if (!authConfigured()) return Response.json({ error: "Chưa cấu hình ADMIN_PASSWORD (≥ 8 ký tự) và ADMIN_SESSION_SECRET (≥ 16 ký tự) trên Vercel." }, { status: 503 });
  try {
    const ipHash = await hashText("login|" + clientIp(request));
    const failures = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM login_attempts WHERE ip_hash=$1 AND created_at>$2", [ipHash, Date.now() - WINDOW_MS]);
    if (Number(failures?.n ?? 0) >= MAX_FAILURES) return Response.json({ error: "Bạn đã nhập sai nhiều lần. Vui lòng thử lại sau 15 phút." }, { status: 429 });
    const body = await request.json().catch(() => ({})) as { password?: unknown };
    const password = String(body.password ?? "").slice(0, 200);
    if (!(await checkPassword(password))) {
      await query("INSERT INTO login_attempts (ip_hash,created_at) VALUES ($1,$2)", [ipHash, Date.now()]);
      await query("DELETE FROM login_attempts WHERE created_at<$1", [Date.now() - 24 * 3600 * 1000]);
      return Response.json({ error: "Mật khẩu chưa đúng." }, { status: 401 });
    }
    await query("DELETE FROM login_attempts WHERE ip_hash=$1", [ipHash]);
    (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE,
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/login", e);
    return Response.json({ error: "Không thể đăng nhập lúc này. Vui lòng thử lại." }, { status: 503 });
  }
}
