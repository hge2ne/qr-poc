import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "대입설명회 QR 입장 관리",
  description: "대입설명회 학부모 QR 입장 확인 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-background antialiased">{children}</body>
    </html>
  );
}
