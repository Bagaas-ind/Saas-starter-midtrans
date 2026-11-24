import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "saas-starter — Next.js 15, Supabase & Midtrans Boilerplate",
    template: "%s | saas-starter",
  },
  description:
    "Production-ready open-source SaaS starter kit built with Next.js 15 App Router, React 19, TypeScript, Supabase SSR Auth, and Midtrans Snap payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
  const snapScriptUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans">
        {children}
        {midtransClientKey ? (
          <Script
            src={snapScriptUrl}
            data-client-key={midtransClientKey}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
