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
  description: "",
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
