import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "./lib/clerk-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pacifica CRM | Every Lead Worked",
  description: "A focused lead CRM with browser calling, messaging, AI-assisted follow-up, pipelines, and live reporting.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=3", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/pacifica-icon-192.png?v=3", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=3",
    apple: "/apple-touch-icon.png?v=3",
  },
  openGraph: {
    title: "Pacifica CRM | Every Lead Worked",
    description: "Import leads, call and text through Twilio, and manage every follow-up from one focused workspace.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pacifica CRM | Every Lead Worked",
    description: "Import leads, call and text through Twilio, and manage every follow-up from one focused workspace.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = isClerkConfigured();
  return (
    <html lang="en" data-theme="light">
      <body>{clerkEnabled?<ClerkProvider dynamic>{children}</ClerkProvider>:children}</body>
    </html>
  );
}
