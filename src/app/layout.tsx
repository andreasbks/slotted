import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OptionalClerkProvider } from "@/components/slotted/optional-clerk-provider";
import { IdentityClaim } from "@/components/slotted/identity-claim";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "slotted",
  description: "Group time polls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F6F5F2] text-[#141413] selection:bg-[#141413] selection:text-[#F6F5F2]">
        <OptionalClerkProvider>
          <IdentityClaim />
          {children}
        </OptionalClerkProvider>
      </body>
    </html>
  );
}
