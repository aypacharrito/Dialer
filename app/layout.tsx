import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pacifica | Insurance Sales Command Center",
  description: "A focused CRM and browser-based power dialer for importing leads, making Twilio calls, recording outcomes, and managing follow-ups.",
  icons: {
    icon: [{ url: "/pacifica-mark.png", type: "image/png" }],
    shortcut: "/pacifica-mark.png",
    apple: "/pacifica-mark.png",
  },
  openGraph: {
    title: "Pacifica | Insurance Sales Command Center",
    description: "Import leads, call through Twilio, and manage every follow-up from one focused CRM workspace.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pacifica | Insurance Sales Command Center",
    description: "Import leads, call through Twilio, and manage every follow-up from one focused CRM workspace.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{process.env.VERCEL?<ClerkProvider dynamic>{children}</ClerkProvider>:children}</body>
    </html>
  );
}
