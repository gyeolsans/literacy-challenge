"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getBasicStats, getDifficultyStats, getGradeDistribution, getScoreTrend, getTypeAccuracyStats } from "@/lib/statsService";

const gradeColors: Record<string, string> = {
  A: "#38bdf8",
  B: "#34d399",
  C: "#f59e0b",
  D: "#f87171",
};

export default function StatsPage() {
  const [basic, setBasic] = useState({ totalTests: 0, bestScore: 0, averageScore: 0, accuracy: 0 });
  const [scoreTrend, setScoreTrend] = useState<{ date: string; score: number }[]>([]);
  const [difficultyStats, setDifficultyStats] = useState<{ difficulty: string; averageScore: number }[]>([]);
  const [typeAccuracy, setTypeAccuracy] = useState<{ type: string; accuracy: number }[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<{ grade: string; count: number }[]>([]);

  useEffect(() => {
    setBasic(getBasicStats());
    setScoreTrend(getScoreTrend());
    setDifficultyStats(getDifficultyStats());
    setTypeAccuracy(getTypeAccuracyStats());
    setGradeDistribution(getGradeDistribution());
  }, []);

  return (
    <div className="space-y-8 pb-24">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">통계 페이지</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">학습 통계</h2>
        <p className="mt-3 text-slate-300">나의 점수 변화, 난이도별 성과, 유형별 정답률을 한눈에 확인하세요.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {[
          { title: "총 테스트 횟수", value: basic.totalTests },
          { title: "최고 점수", value: basic.bestScore },
          { title: "평균 점수", value: basic.averageScore },
          { title: "전체 정답률", value: `${basic.accuracy}%` },
        ].map((item) => (
          <div key={item.title} className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <p className="text-sm text-slate-400">{item.title}</p>
            <p className="mt-4 text-4xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h3 className="text-xl font-semibold text-white">최근 점수 변화</h3>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#cbd5e1" }} />
                <YAxis tick={{ fill: "#cbd5e1" }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h3 className="text-xl font-semibold text-white">난이도별 평균 점수</h3>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyStats}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="difficulty" tick={{ fill: "#cbd5e1" }} />
                <YAxis tick={{ fill: "#cbd5e1" }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Bar dataKey="averageScore" fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h3 className="text-xl font-semibold text-white">문제 유형별 정답률</h3>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeAccuracy}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fill: "#cbd5e1" }} />
                <YAxis tick={{ fill: "#cbd5e1" }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
                <Bar dataKey="accuracy" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <h3 className="text-xl font-semibold text-white">등급 분포</h3>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={90} fill="#38bdf8" label>
                  {gradeDistribution.map((entry) => (
                    <Cell key={entry.grade} fill={gradeColors[entry.grade] ?? "#a78bfa"} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ color: "#cbd5e1" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
