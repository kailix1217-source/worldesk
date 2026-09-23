import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Worldesk",
  description: "Local news from trusted local papers, briefed for where your trip goes next.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F4F5F8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
