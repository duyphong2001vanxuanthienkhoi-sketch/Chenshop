import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authConfigured, isAdmin } from "../../../lib/auth";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Đăng nhập quản trị", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <LoginForm configured={authConfigured()} />;
}
