import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "../../lib/auth";
import Admin from "./workspace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quản trị", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <Admin />;
}
