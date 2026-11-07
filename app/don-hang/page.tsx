import type { Metadata } from "next";
import Lookup from "./lookup";

export const metadata: Metadata = { title: "Tra cứu đơn hàng", robots: { index: false, follow: false } };

export default function Page() {
  return <Lookup />;
}
