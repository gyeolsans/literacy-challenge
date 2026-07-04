import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "문해력 테스트 MVP",
  description: "문해력 테스트 게임 웹사이트 MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <NavBar />
          <main className="mt-6 flex-1 pb-28">{children}</main>
        </div>
      </body>
    </html>
  );
}
