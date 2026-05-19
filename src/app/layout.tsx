import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "江端AI秘書",
  description: "Zoom予約・カレンダー登録・メール通知を自動化する準備中のMVPです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
