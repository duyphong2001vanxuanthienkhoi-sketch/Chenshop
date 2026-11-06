// Password-based admin login for the shop owner.
// The session cookie is an HMAC-signed expiry time. The signing key mixes
// ADMIN_SESSION_SECRET with ADMIN_PASSWORD, so changing the password on Vercel
// signs every existing session out.
import { cookies } from "next/headers";

export const SESSION_COOKIE = "chen_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const isHosted = () => !!process.env.VERCEL;
const encoder = new TextEncoder();

/** Local development falls back to the values documented in .env.example. */
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || (isHosted() ? "" : "chenshop-dev");
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || (isHosted() ? "" : "local-dev-session-secret-not-for-production");
}

export function authConfigured(): boolean {
  return adminPassword().length >= 8 && sessionSecret().length >= 16;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashText(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(sessionSecret() + "|" + value)));
}

export async function checkPassword(input: string): Promise<boolean> {
  if (!authConfigured()) return false;
  // Compare HMACs so the comparison time does not depend on the password.
  const [a, b] = await Promise.all([hmac(sessionSecret(), "pw|" + input), hmac(sessionSecret(), "pw|" + adminPassword())]);
  return safeEqual(a, b);
}

export async function createSessionToken(): Promise<string> {
  const payload = `v1.${Date.now() + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${await hmac(sessionSecret() + "|" + adminPassword(), payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !authConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isSafeInteger(expires) || expires < Date.now()) return false;
  const expected = await hmac(sessionSecret() + "|" + adminPassword(), `${parts[0]}.${parts[1]}`);
  return safeEqual(parts[2], expected);
}

export async function isAdmin(): Promise<boolean> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

/** Rejects state-changing requests that come from another website. */
export function sameOrigin(request: Request): boolean {
  if (["GET", "HEAD"].includes(request.method)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === new URL(request.url).host || host === request.headers.get("x-forwarded-host") || host === request.headers.get("host");
  } catch {
    return false;
  }
}
