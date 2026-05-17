import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starbucks Queue Simulator",
  description: "M/M/1 vs M/M/c café queue simulation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
