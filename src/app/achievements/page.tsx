"use client";

import { useEffect, useState } from "react";
import { getAchievements } from "@/lib/achievementService";
import type { AchievementRecord } from "@/lib/types";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);

  useEffect(() => {
    setAchievements(getAchievements());
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">업적 페이지</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">달성한 업적을 모아보세요</h2>
        <p className="mt-3 text-slate-300">테스트를 진행하면서 업적이 자동으로 해금됩니다.</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {achievements.map((item) => (
          <div key={item.id} className={`rounded-3xl border p-6 ${item.achieved ? "border-emerald-500/40 bg-emerald-500/10" : "border-slate-800 bg-slate-950"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm text-slate-400">{item.description}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.achieved ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-300"}`}>
                {item.achieved ? "해금됨" : "미해금"}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-300">{item.achievedAt ? `달성일: ${new Date(item.achievedAt).toLocaleDateString()}` : "아직 달성하지 않았습니다."}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
