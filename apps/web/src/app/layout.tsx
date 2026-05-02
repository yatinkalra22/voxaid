import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VoxAID — Voice-First Health Triage",
  description:
    "Screen depression, anxiety, and NCD risk in 60 seconds with a phone call. No smartphone, no data plan, no literacy required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("font-sans", inter.variable, sora.variable)}>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
