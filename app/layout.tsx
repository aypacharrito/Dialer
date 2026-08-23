import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PacificaTools | Insurance Sales Command Center",
  description: "A focused CRM and browser-based power dialer for importing leads, making Twilio calls, recording outcomes, and managing follow-ups.",
  openGraph: {
    title: "PacificaTools | Insurance Sales Command Center",
    description: "Import leads, call through Twilio, and manage every follow-up from one focused CRM workspace.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PacificaTools | Insurance Sales Command Center",
    description: "Import leads, call through Twilio, and manage every follow-up from one focused CRM workspace.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
