import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "@/app/globals.css";

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${firaCode.variable} ${firaSans.variable}`}>
        {children}
      </body>
    </html>
  );
}
