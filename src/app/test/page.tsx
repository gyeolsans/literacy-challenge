"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QuestionCard from "@/components/QuestionCard";
import { addTestRecord, addExperience, getUser } from "@/lib/userService";
import { saveRanking } from "@/lib/rankingService";
import { addWrongNote, getWrongNotes } from "@/lib/wrongNoteService";
import { checkAchievements } from "@/lib/achievementService";
import { saveLastResult } from "@/lib/storageService";
import { selectQuestions, buildQuizResult, buildRankingRecord, createQuestionResults } from "@/lib/quizService";
import { questions } from "@/data/questions";
import type { Difficulty, Question } from "@/lib/types";

const difficultyLabel: Record<Difficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

const calculateExperienceGain = (score: number) => {
  let gain = 20;
  if (score >= 60) gain += 10;
  if (score >= 80) gain += 20;
  if (score >= 90) gain += 30;
  if (score === 100) gain += 50;
  return gain;
};

export default function TestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const difficulty = (searchParams.get("difficulty") as Difficulty) || "easy";
  const retry = searchParams.get("retry") === "true";
  const [questionSet, setQuestionSet] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [message, setMessage] = useState("");

  const currentQuestion = questionSet[currentIndex];
  const selected = selectedAnswers[currentIndex] ?? null;

  useEffect(() => {
    const savedWrongNotes = retry ? getWrongNotes() : [];
    const initialQuestions = retry && savedWrongNotes.length > 0
      ? savedWrongNotes.slice(0, 10).map((item) => ({
          id: item.questionId,
          passage: item.passage,
          type: item.type,
          difficulty: item.difficulty,
          question: item.question,
          choices: item.options,
          answer: item.correctAnswer,
          explanation: item.explanation,
        }))
      : selectQuestions(questions, difficulty, 10);

    setQuestionSet(initialQuestions);
    setSelectedAnswers(Array(initialQuestions.length).fill(""));
    setCurrentIndex(0);
    setStartedAt(Date.now());
    setMessage(retry ? "오답노트 문제로 다시 풀기 모드입니다." : "");
  }, [difficulty, retry]);

  const handleSelect = (value: string) => {
    const next = [...selectedAnswers];
    next[currentIndex] = value;
    setSelectedAnswers(next);
  };

  const answeredCount = selectedAnswers.filter(Boolean).length;
  const isReadyToSubmit = questionSet.length > 0 && answeredCount === questionSet.length;

  const handleSubmit = () => {
    if (!isReadyToSubmit) {
      setMessage("모든 문제를 선택한 뒤 제출하세요.");
      return;
    }

    const totalTime = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const user = getUser();
    const nickname = user?.nickname || "게스트";
    const questionResults = createQuestionResults(questionSet, selectedAnswers, Math.round(totalTime / questionSet.length));
    const rankingRecord = buildRankingRecord(nickname, difficulty, questionResults, totalTime);
    const levelBefore = user?.level ?? 1;
    const earnedExperience = calculateExperienceGain(rankingRecord.score);
    const updatedUser = addExperience(rankingRecord.score) ?? user;

    addTestRecord(rankingRecord);
    saveRanking(rankingRecord);

    questionResults.filter((item) => !item.isCorrect).forEach(addWrongNote);
    const wrongNotes = getWrongNotes();
    const achievements = checkAchievements({ totalTests: updatedUser?.testCount ?? 0 }, rankingRecord, wrongNotes).map((item) => item.title);

    const typeStats = Object.entries(rankingRecord.problemTypeStats).map(([type, stats]) => ({
      type,
      accuracy: stats.totalCount > 0 ? stats.correctCount / stats.totalCount : 0,
    }));
    const strongType = typeStats.sort((a, b) => b.accuracy - a.accuracy)[0]?.type ?? "없음";
    const weakType = typeStats.sort((a, b) => a.accuracy - b.accuracy)[0]?.type ?? "없음";
    const advice = rankingRecord.score >= 90
      ? "훌륭합니다! 약한 유형을 복습하면 더 높은 점수를 얻을 수 있습니다."
      : rankingRecord.score >= 70
      ? `보완이 필요합니다. 약한 유형 ${weakType}을 다시 살펴보세요.`
      : `기본 개념을 다시 확인하고 ${weakType} 유형을 집중 학습하세요.`;

    const result = buildQuizResult(rankingRecord, earnedExperience, levelBefore, updatedUser?.level ?? levelBefore, strongType, weakType, advice, achievements);
    saveLastResult(result);
    router.push("/result");
  };

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">테스트 페이지</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{difficultyLabel[difficulty]} 난이도 테스트</h2>
            <p className="mt-3 text-slate-300">총 10문제를 풀고, 결과는 자동으로 랭킹, 오답노트, 내 정보에 반영됩니다.</p>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-950 px-5 py-4 text-sm text-slate-300">
            <p>진행: {answeredCount}/{questionSet.length}</p>
            <p className="mt-2">현재 문제: {questionSet.length ? currentIndex + 1 : 0}</p>
          </div>
        </div>
      </section>

      {questionSet.length > 0 ? (
        <section className="space-y-6">
          <QuestionCard question={currentQuestion} selected={selected} onSelect={handleSelect} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:border-accent hover:bg-slate-800"
                disabled={currentIndex === 0}
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((idx) => Math.min(questionSet.length - 1, idx + 1))}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:border-accent hover:bg-slate-800"
                disabled={currentIndex === questionSet.length - 1}
              >
                다음
              </button>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-700"
              disabled={!isReadyToSubmit}
            >
              정답 제출하기
            </button>
          </div>
          {message ? <p className="text-sm text-warning">{message}</p> : null}
        </section>
      ) : (
        <p className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-300">문제를 불러오는 중입니다...</p>
      )}
    </div>
  );
}
