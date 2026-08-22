import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pacific Dialer | Power Dialing Command Center",
  description: "A focused CRM and browser-based power dialer for importing leads, making Twilio calls, recording outcomes, and managing follow-ups.",
  openGraph: {
    title: "Pacific Dialer | Power Dialing Command Center",
    description: "Import leads, call through Twilio, and manage every follow-up from one focused CRM workspace.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pacific Dialer | Power Dialing Command Center",
    description: "Import leads, call through Twilio, and manage every follow-up from one focused CRM workspace.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
