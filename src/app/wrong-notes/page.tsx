"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { filterWrongNotes, getFrequentWrongNotes, getUnmasteredWrongNotes, getWrongNotes, markAsMastered, clearWrongNotes, removeWrongNote } from "@/lib/wrongNoteService";
import type { WrongNoteItem } from "@/lib/types";

const difficulties = ["all", "easy", "normal", "hard"] as const;

export default function WrongNotesPage() {
  const [notes, setNotes] = useState<WrongNoteItem[]>([]);
  const [difficulty, setDifficulty] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [onlyFrequent, setOnlyFrequent] = useState(false);
  const [onlyUnmastered, setOnlyUnmastered] = useState(true);

  useEffect(() => {
    setNotes(getWrongNotes());
  }, []);

  const typeOptions = useMemo(() => {
    return Array.from(new Set(notes.map((item) => item.type))).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let current = onlyFrequent ? getFrequentWrongNotes() : getWrongNotes();
    if (onlyUnmastered) {
      current = getUnmasteredWrongNotes();
    }
    if (difficulty !== "all") {
      current = current.filter((item) => item.difficulty === difficulty);
    }
    if (typeFilter) {
      current = current.filter((item) => item.type === typeFilter);
    }
    return current;
  }, [difficulty, onlyFrequent, onlyUnmastered, typeFilter]);

  const handleMastered = (questionId: string) => {
    markAsMastered(questionId);
    setNotes(getWrongNotes());
  };

  const handleRemove = (questionId: string) => {
    removeWrongNote(questionId);
    setNotes(getWrongNotes());
  };

  const handleClear = () => {
    clearWrongNotes();
    setNotes([]);
  };

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">오답노트 페이지</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">오답 복습</h2>
        <p className="mt-3 text-slate-300">오답노트는 자주 틀린 문제를 관리하고 숙달 상태를 확인할 수 있는 복습 도구입니다.</p>
      </section>

      <section className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/40 sm:grid-cols-2 lg:grid-cols-4">
        <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
          {difficulties.map((value) => (
            <option key={value} value={value}>{value === "all" ? "전체" : value === "easy" ? "쉬움" : value === "normal" ? "보통" : "어려움"}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
          <option value="">전체 유형</option>
          {typeOptions.map((typeOption) => (
            <option key={typeOption} value={typeOption}>{typeOption}</option>
          ))}
        </select>
        <button type="button" onClick={() => setOnlyFrequent((prev) => !prev)} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${onlyFrequent ? "bg-accent text-white" : "border border-slate-700 bg-slate-900 text-slate-100 hover:border-accent hover:bg-slate-800"}`}>
          자주 틀린 문제만
        </button>
        <button type="button" onClick={() => setOnlyUnmastered((prev) => !prev)} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${onlyUnmastered ? "bg-accent text-white" : "border border-slate-700 bg-slate-900 text-slate-100 hover:border-accent hover:bg-slate-800"}`}>
          {onlyUnmastered ? "숙달되지 않은 문제" : "전체 문제"}
        </button>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/test?retry=true" className="rounded-2xl border border-accent bg-accent/10 px-5 py-3 text-sm font-semibold text-white hover:bg-accent/20">
          오답노트로 다시 풀기
        </Link>
        <button onClick={handleClear} className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:border-accent hover:bg-slate-800">
          오답노트 초기화
        </button>
      </div>

      <section className="space-y-4">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((item) => (
            <div key={item.questionId} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{item.difficulty} · {item.type}</p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.question}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isMastered ? "bg-green-500/15 text-green-300" : "bg-slate-800 text-slate-300"}`}>
                  {item.isMastered ? "숙달 완료" : "미숙달"}
                </span>
              </div>
              <p className="mt-4 text-slate-300">내 답: {item.selectedAnswer}</p>
              <p className="mt-1 text-slate-300">정답: {item.correctAnswer}</p>
              <p className="mt-3 text-slate-300">해설: {item.explanation}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!item.isMastered && (
                  <button onClick={() => handleMastered(item.questionId)} className="rounded-2xl border border-accent bg-accent/10 px-4 py-2 text-sm font-semibold text-white hover:bg-accent/20">
                    숙달 완료로 표시
                  </button>
                )}
                <button onClick={() => handleRemove(item.questionId)} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:border-accent hover:bg-slate-800">
                  삭제
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 text-slate-400">필터에 해당하는 오답노트가 없습니다. 테스트 후 틀린 문제가 자동으로 저장됩니다.</div>
        )}
      </section>
    </div>
  );
}
