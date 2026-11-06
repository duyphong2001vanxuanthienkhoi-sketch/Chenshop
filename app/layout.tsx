import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "./globals.css";
import ContactWidget from "./contact-widget";
import { siteUrl } from "../lib/site";

// Self-hosted at build time (no request to Google from visitors) with the Vietnamese subset.
const beVietnam = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["300", "400", "500", "600", "700", "800", "900"], variable: "--font-be-vietnam", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin", "vietnamese"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });

const title = "Chen Shop | Art toys & đồ chơi sưu tầm";
const description = "Khám phá thế giới đồ chơi sưu tầm tại Chen Shop. Squishy, Bean, Figure, art toys và những điều nhỏ bé đầy cảm hứng.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: title, template: "%s | Chen Shop" },
  description,
  applicationName: "Chen Shop",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Chen Shop",
    title,
    description,
    images: [{ url: "/images/squishy-stage.png", alt: "Chen Shop — art toys & little joys" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/images/squishy-stage.png"] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${playfair.variable}`}>
      <body className="antialiased">
        {children}
        <ContactWidget />
      </body>
    </html>
  );
}
