import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import "./globals.css";

const bodyFont = Bricolage_Grotesque({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f0c0b",
};

export const metadata: Metadata = {
  title: "Musculit.O",
  description: "Tracking de gym, progresion de cargas y journal personal.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Musculit.O",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${bodyFont.variable} ${displayFont.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
