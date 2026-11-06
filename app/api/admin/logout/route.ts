import { cookies } from "next/headers";
import { sameOrigin, SESSION_COOKIE } from "../../../../lib/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
