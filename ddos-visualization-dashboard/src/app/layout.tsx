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
  title: "DDoS Attack Simulator | CyberRange Red Team",
  description: "Real-time DDoS Attack Visualization and Orchestration Dashboard - CyberRange Red Team Operations",
  keywords: ["ddos", "cyber range", "red team", "attack simulation", "network security"],
  authors: [{ name: "CyberRange Red Team" }],
  openGraph: {
    title: "DDoS Attack Simulator | CyberRange Red Team",
    description: "Real-time DDoS Attack Visualization and Orchestration Dashboard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          background: 'hsl(0 20% 8%)',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
