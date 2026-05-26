// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "CampRoomOps | Room Operations Management",
    template: "%s | CampRoomOps",
  },
  description:
    "Internal room operations system for camp accommodation, guest movement, room allocation, stays, security handoffs, and operational reporting.",
  applicationName: "CampRoomOps",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      nocache: true,
      noimageindex: true,
      nosnippet: true,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#eef6ff",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#162231",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): React.JSX.Element {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
