"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadLastResult } from "@/lib/storageService";

export default function ResultPage() {
  const [result, setResult] = useState<typeof import("@/lib/types").QuizResult | null>(null);

  useEffect(() => {
    setResult(loadLastResult());
  }, []);

  if (!result) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-300">
        <p>최근 결과가 없습니다. 테스트를 먼저 완료하세요.</p>
        <Link href="/test" className="mt-4 inline-block rounded-2xl border border-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent/10">
          테스트 시작
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">총점</p>
            <p className="mt-3 text-5xl font-bold text-white">{result.score}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">등급</p>
            <p className="mt-3 text-4xl font-bold text-white">{result.grade}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">정답 / 오답</p>
            <p className="mt-3 text-4xl font-bold text-white">{result.correctCount} / {result.wrongCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">습득 경험치</p>
            <p className="mt-3 text-4xl font-bold text-white">+{result.earnedExperience} XP</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm text-slate-400">총 풀이 시간</p>
          <p className="mt-3 text-3xl font-semibold text-white">{result.totalTime}s</p>
          <p className="mt-2 text-sm text-slate-300">평균 {result.averageTime}s</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm text-slate-400">레벨 변화</p>
          <p className="mt-3 text-3xl font-semibold text-white">Lv. {result.levelBefore} → Lv. {result.levelAfter}</p>
          <p className="mt-2 text-sm text-slate-300">{result.leveledUp ? "레벨업 성공!" : "다음 레벨을 향해 계속 도전하세요."}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-white">맞춤형 분석</h3>
            <p className="mt-2 text-slate-300">강한 유형과 약한 유형, 그리고 다음 학습 포인트를 알려드립니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-sm text-slate-400">강한 문제 유형</p>
              <p className="mt-3 text-lg font-semibold text-white">{result.strongType}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-sm text-slate-400">약한 문제 유형</p>
              <p className="mt-3 text-lg font-semibold text-white">{result.weakType}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm text-slate-400">조언</p>
          <p className="mt-3 text-slate-200">{result.advice}</p>
        </div>
      </section>

      {result.achievements.length > 0 ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/40">
          <h3 className="text-2xl font-semibold text-white">획득 업적</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {result.achievements.map((achievement) => (
              <span key={achievement} className="rounded-full border border-accent bg-accent/10 px-4 py-2 text-sm text-accent">
                {achievement}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <h3 className="text-2xl font-semibold text-white">문제별 해설</h3>
        <div className="mt-6 space-y-4">
          {result.questions.map((item) => (
            <div key={item.questionId} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-400">{item.difficulty} · {item.type}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isCorrect ? "bg-green-500/15 text-green-300" : "bg-rose-500/15 text-rose-300"}`}>
                  {item.isCorrect ? "정답" : "오답"}
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold text-white">{item.question}</p>
              <p className="mt-3 text-slate-300">내 답: {item.selectedAnswer}</p>
              <p className="mt-1 text-slate-300">정답: {item.correctAnswer}</p>
              <p className="mt-3 text-slate-300">해설: {item.explanation}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
