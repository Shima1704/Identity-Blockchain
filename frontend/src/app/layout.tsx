import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VNChain – Định danh số Blockchain",
  description:
    "Hệ thống quản lý thông tin người dùng dựa trên Blockchain. Đăng ký, xác thực và quản lý danh tính số an toàn, minh bạch.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
