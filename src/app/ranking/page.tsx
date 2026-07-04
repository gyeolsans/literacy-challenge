"use client";

import { useEffect, useMemo, useState } from "react";
import { getRankings, getTodayRankings, getWeeklyRankings, sortRankings } from "@/lib/rankingService";
import { getUser } from "@/lib/userService";
import type { RankingRecord } from "@/lib/types";

const sortOptions = [
  { value: "score", label: "점수 높은 순" },
  { value: "time", label: "풀이 시간 짧은 순" },
  { value: "date", label: "최신순" },
];

const difficultyOptions = [
  { value: "all", label: "전체" },
  { value: "easy", label: "쉬움" },
  { value: "normal", label: "보통" },
  { value: "hard", label: "어려움" },
];

const rangeOptions = [
  { value: "all", label: "전체" },
  { value: "today", label: "오늘" },
  { value: "week", label: "주간" },
];

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingRecord[]>([]);
  const [sortType, setSortType] = useState<"score" | "time" | "date">("score");
  const [difficulty, setDifficulty] = useState("all");
  const [range, setRange] = useState("all");
  const [search, setSearch] = useState("");
  const [myOnly, setMyOnly] = useState(false);

  const user = getUser();
  const myNickname = user?.nickname ?? "";

  useEffect(() => {
    setRankings(getRankings());
  }, []);

  const filteredRankings = useMemo(() => {
    let data = range === "today" ? getTodayRankings() : range === "week" ? getWeeklyRankings() : getRankings();
    if (difficulty !== "all") {
      data = data.filter((item) => item.difficulty === difficulty);
    }
    if (search.trim()) {
      const keyword = search.trim().toLowerCase();
      data = data.filter((item) => item.nickname.toLowerCase().includes(keyword));
    }
    if (myOnly && myNickname) {
      data = data.filter((item) => item.nickname === myNickname);
    }
    return sortRankings(data, sortType);
  }, [difficulty, myOnly, range, search, sortType, myNickname]);

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">랭킹 페이지</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">로컬 랭킹</h2>
        <p className="mt-3 text-slate-300">랭킹을 필터하고 검색하여 나의 기록과 전체 순위를 빠르게 확인하세요.</p>
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/40">
        <div className="grid gap-3 lg:grid-cols-4">
          <select value={range} onChange={(event) => setRange(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
            {difficultyOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={sortType} onChange={(event) => setSortType(event.target.value as "score" | "time" | "date")} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button onClick={() => setMyOnly((prev) => !prev)} className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${myOnly ? "bg-accent text-white" : "border border-slate-700 bg-slate-900 text-slate-100 hover:border-accent hover:bg-slate-800"}`}>
            {myOnly ? "내 기록 보기" : "전체 기록 보기"}
          </button>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="닉네임 검색"
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/40">
        <div className="grid grid-cols-12 gap-4 bg-slate-950 px-5 py-4 text-sm uppercase tracking-[0.3em] text-slate-400">
          <span className="col-span-1">순위</span>
          <span className="col-span-3">닉네임</span>
          <span className="col-span-2">점수</span>
          <span className="col-span-2">시간</span>
          <span className="col-span-2">등급</span>
          <span className="col-span-2">날짜</span>
        </div>
        <div className="divide-y divide-slate-800">
          {filteredRankings.length > 0 ? (
            filteredRankings.map((item, index) => {
              const badge = index === 0 ? "bg-yellow-400/20 text-yellow-300" : index === 1 ? "bg-slate-700/60 text-slate-100" : index === 2 ? "bg-slate-700/40 text-slate-100" : "";
              const isMine = item.nickname === myNickname;
              return (
                <div key={item.id} className={`grid grid-cols-12 gap-4 px-5 py-4 text-sm transition ${badge}`}>
                  <span className="col-span-1 font-semibold text-white">{index + 1}</span>
                  <div className="col-span-3 flex items-center gap-2">
                    <span>{item.nickname}</span>
                    {isMine ? <span className="rounded-full bg-accent px-2 py-1 text-xs text-white">내 기록</span> : null}
                  </div>
                  <span className="col-span-2">{item.score}</span>
                  <span className="col-span-2">{item.totalTime}s</span>
                  <span className="col-span-2">{item.grade}</span>
                  <span className="col-span-2 text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-8 text-center text-slate-400">필터에 해당하는 랭킹이 없습니다. 테스트를 완료하고 다시 확인해보세요.</div>
          )}
        </div>
      </section>
    </div>
  );
}
