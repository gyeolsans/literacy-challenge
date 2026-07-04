"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "홈", href: "/" },
  { label: "테스트", href: "/test" },
  { label: "오늘의 문제", href: "/today" },
  { label: "출석", href: "/attendance" },
  { label: "목표", href: "/goals" },
  { label: "업적", href: "/achievements" },
  { label: "랭킹", href: "/ranking" },
  { label: "내 정보", href: "/profile" },
  { label: "오답노트", href: "/wrong-notes" },
  { label: "통계", href: "/stats" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">문해력 테스트</p>
          <h1 className="text-3xl font-semibold text-white">MVP 게임</h1>
        </div>
        <nav className="hidden flex-wrap gap-2 md:flex">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  active ? "border-accent bg-accent/20 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-accent/80 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between border-t border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 md:hidden">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 rounded-2xl px-2 py-2 text-center transition ${
                active ? "bg-slate-900 text-white" : "hover:bg-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
