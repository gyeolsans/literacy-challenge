"use client";

import { useEffect, useMemo, useState } from "react";
import { getUser, getUserStats, resetUserData, updateNickname } from "@/lib/userService";
import Link from "next/link";

export default function ProfilePage() {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState(getUserStats());

  useEffect(() => {
    const user = getUser();
    if (user) {
      setNickname(user.nickname);
      setStats(getUserStats());
    }
  }, []);

  const handleSaveNickname = () => {
    if (updateNickname(nickname)) {
      setMessage("닉네임이 저장되었습니다.");
      setStats(getUserStats());
      return;
    }
    setMessage("닉네임은 1~10자 사이여야 합니다.");
  };

  const handleReset = () => {
    resetUserData();
    setStats(getUserStats());
    setMessage("데이터가 초기화되었습니다.");
  };

  const scoreTrend = useMemo(() => stats.recentRecords.map((record) => record.score), [stats.recentRecords]);
  const scoreChanges = useMemo(
    () => scoreTrend.map((score, index) => (index === 0 ? 0 : score - scoreTrend[index - 1])),
    [scoreTrend],
  );

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">내 정보 페이지</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{stats.nickname}님의 프로필</h2>
            <p className="mt-3 text-slate-300">레벨, 경험치, 최근 기록을 확인하고 닉네임을 관리하세요.</p>
          </div>
          <button onClick={handleReset} className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:border-accent hover:bg-slate-800">
            프로필 초기화
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/40">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">닉네임</p>
            <div className="mt-3 flex gap-3">
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100" />
              <button onClick={handleSaveNickname} className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent/90">저장</button>
            </div>
            {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">칭호</p>
            <p className="mt-3 text-2xl font-semibold text-white">{stats.title}</p>
            <p className="mt-2 text-sm text-slate-300">Lv. {stats.level} · 경험치 {stats.experience}/{stats.nextLevelExp}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((stats.experience / stats.nextLevelExp) * 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          { label: "테스트 횟수", value: stats.totalTests },
          { label: "최고 점수", value: stats.bestScore },
          { label: "평균 점수", value: stats.averageScore },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-4 text-4xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold text-white">누적 통계</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { label: "총 정답 수", value: stats.totalCorrect },
              { label: "총 오답 수", value: stats.totalWrong },
              { label: "전체 정답률", value: `${stats.accuracy}%` },
              { label: "최근 등급", value: stats.recentGrade },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold text-white">문제 유형 분석</h3>
          <div className="mt-5 grid gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">가장 많이 푼 난이도</p>
              <p className="mt-3 text-lg text-white">{stats.mostPlayedDifficulty}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">가장 강한 유형</p>
              <p className="mt-3 text-lg text-white">{stats.strongestType}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">가장 약한 유형</p>
              <p className="mt-3 text-lg text-white">{stats.weakestType}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <h3 className="text-xl font-semibold text-white">최근 테스트 기록</h3>
        <div className="mt-4 space-y-4">
          {stats.recentRecords.length ? (
            stats.recentRecords.map((record) => (
              <div key={record.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{new Date(record.date).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-400">{record.difficulty}</p>
                </div>
                <p className="mt-2 text-lg font-semibold text-white">{record.score}점 · {record.grade}</p>
                <p className="mt-2 text-slate-300">정답 {record.correctCount} / 오답 {record.wrongCount} · 평균 {record.averageTime}s</p>
              </div>
            ))
          ) : (
            <p className="text-slate-400">최근 테스트 기록이 없습니다.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="text-sm text-slate-400">더 많은 기록은 테스트를 진행하면 자동으로 반영됩니다.</p>
        <Link href="/test" className="mt-4 inline-block rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent/90">
          테스트 다시 시작
        </Link>
      </section>
    </div>
  );
}
