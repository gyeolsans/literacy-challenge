"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUser, getUserStats, updateNickname } from "@/lib/userService";
import type { Difficulty } from "@/lib/types";

const difficulties: { label: string; value: Difficulty }[] = [
  { label: "쉬움", value: "easy" },
  { label: "보통", value: "normal" },
  { label: "어려움", value: "hard" },
];

export default function HomePage() {
  const [nickname, setNickname] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState(getUserStats());

  useEffect(() => {
    const user = getUser();
    if (user) {
      setNickname(user.nickname);
      setMessage(`${user.nickname}님, 환영합니다.`);
      setStats(getUserStats());
    }
  }, []);

  const welcomeText = useMemo(() => {
    if (stats.totalTests > 0) {
      return `${stats.nickname}님의 레벨 ${stats.level}(${stats.title})입니다.`;
    }
    return nickname ? `${nickname}님, 문해력 테스트를 시작하세요.` : "닉네임을 설정하고 난이도를 선택하세요.";
  }, [nickname, stats]);

  const handleSave = () => {
    if (updateNickname(nickname)) {
      setMessage("닉네임이 저장되었습니다.");
      setStats(getUserStats());
      return;
    }
    setMessage("닉네임은 1자 이상 10자 이하로 입력해주세요.");
  };

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">메인 페이지</p>
            <h2 className="mt-2 text-4xl font-semibold text-white">문해력 테스트 게임</h2>
            <p className="mt-3 max-w-2xl text-slate-300">닉네임을 저장하고 난이도를 선택하여 10문제 객관식 테스트를 풀어보세요. 기록은 랭킹, 내 정보, 통계에 모두 반영됩니다.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-inner shadow-slate-950/30">
            <p className="text-sm text-slate-400">현재 레벨</p>
            <p className="mt-3 text-3xl font-semibold text-white">Lv. {stats.level}</p>
            <p className="mt-2 text-sm text-slate-400">칭호: {stats.title}</p>
            <p className="mt-3 text-sm text-slate-300">총 테스트 {stats.totalTests}회 · 평균 {stats.averageScore}점</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm text-slate-400">닉네임</p>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="닉네임을 입력하세요"
            className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
          />
          <button onClick={handleSave} className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90">
            저장
          </button>
          {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm text-slate-400">경험치 진행</p>
          <div className="mt-4 rounded-full bg-slate-900 p-1">
            <div className="h-3 rounded-full bg-accent" style={{ width: `${Math.round((stats.experience / stats.nextLevelExp) * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-300">{stats.experience} / {stats.nextLevelExp} XP</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm text-slate-400">최근 기록</p>
          <div className="mt-4 space-y-3">
            {stats.recentRecords.length ? (
              stats.recentRecords.map((record) => (
                <div key={record.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">{new Date(record.date).toLocaleDateString()}</p>
                  <p className="mt-2 text-white">{record.score}점 · {record.grade} · {record.difficulty}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400">아직 기록이 없습니다.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          { title: "오늘의 문제", description: "매일 한 문제를 도전해보세요.", href: "/today" },
          { title: "출석 & 목표", description: "출석 체크와 목표 달성을 관리하세요.", href: "/attendance" },
          { title: "업적", description: "달성한 업적을 확인해보세요.", href: "/achievements" },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-accent hover:bg-slate-950">
            <h3 className="text-xl font-semibold text-white">{card.title}</h3>
            <p className="mt-3 text-slate-400">{card.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <h3 className="text-2xl font-semibold text-white">{welcomeText}</h3>
        <p className="mt-3 text-slate-300">모바일과 데스크톱 모두에서 게임형 학습을 즐기세요. 점수, 경험치, 통계를 모두 한 곳에서 관리할 수 있습니다.</p>
      </section>
    </div>
  );
}
