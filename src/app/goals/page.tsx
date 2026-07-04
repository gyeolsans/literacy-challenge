"use client";

import { useEffect, useState } from "react";

type GoalItem = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
};

const GOALS_KEY = "munhae_goals";

const defaultGoals: GoalItem[] = [
  { id: "daily_test", title: "오늘 테스트 1회", description: "오늘 한 번 테스트를 완료해보세요.", target: 1, progress: 0, reward: 50, completed: false },
  { id: "weekly_review", title: "주간 복습 3회", description: "이번 주 동안 복습을 3번 이상 해보세요.", target: 3, progress: 0, reward: 80, completed: false },
  { id: "perfect_day", title: "완벽한 날", description: "오늘의 문제를 전부 맞혀보세요.", target: 1, progress: 0, reward: 100, completed: false },
];

const readGoals = (): GoalItem[] => {
  if (typeof window === "undefined") return defaultGoals;
  const raw = window.localStorage.getItem(GOALS_KEY);
  if (!raw) return defaultGoals;
  try {
    return JSON.parse(raw) as GoalItem[];
  } catch {
    return defaultGoals;
  }
};

const writeGoals = (goals: GoalItem[]) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalItem[]>(defaultGoals);

  useEffect(() => {
    setGoals(readGoals());
  }, []);

  const handleAdvance = (goalId: string) => {
    const next = goals.map((goal) => {
      if (goal.id !== goalId) return goal;
      const nextProgress = Math.min(goal.target, goal.progress + 1);
      return { ...goal, progress: nextProgress, completed: nextProgress >= goal.target };
    });
    setGoals(next);
    writeGoals(next);
  };

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">목표 페이지</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">작은 목표를 쌓아 큰 성장을 만드세요</h2>
        <p className="mt-3 text-slate-300">매일 짧게 목표를 달성하고 진행 상황을 확인해보세요.</p>
      </section>

      <section className="grid gap-6">
        {goals.map((goal) => (
          <div key={goal.id} className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{goal.title}</p>
                <p className="mt-2 text-sm text-slate-400">{goal.description}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${goal.completed ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-800 text-slate-200"}`}>
                {goal.completed ? "완료" : "진행 중"}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (goal.progress / goal.target) * 100)}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
              <span>{goal.progress}/{goal.target}</span>
              <span>보상 {goal.reward}XP</span>
            </div>
            <button
              type="button"
              onClick={() => handleAdvance(goal.id)}
              disabled={goal.completed}
              className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              +1 진행하기
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
