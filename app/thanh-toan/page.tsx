import type { Metadata } from "next";
import Checkout from "./checkout";

export const metadata: Metadata = { title: "Thanh toán", robots: { index: false, follow: false } };

export default function Page() {
  return <Checkout />;
}
