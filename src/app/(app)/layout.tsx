import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "@/app/globals.css";

const notoSans = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YOMi - 読書を宇宙に",
  description:
    "YOMiは一冊の本を一つの「星」に見立てて記録し、自分だけの星空を作る読書管理アプリです。",
  openGraph: {
    type: "website",
    title: "YOMi - 読書を宇宙に",
    description:
      "YOMiは一冊の本を一つの「星」に見立てて記録し、自分だけの星空を作る読書管理アプリです。",
    url: "https://yomi.suzuuuuu09.com",
    siteName: "YOMi",
    images: {
      url: "https://yomi.suzuuuuu09.com/ogp.png",
      width: 1200,
      height: 630,
      type: "image/png",
    },
  },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-yomi-theme="dark">
      <body
        className={notoSans.variable}
        style={{ fontFamily: "var(--font-noto-sans-jp), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
