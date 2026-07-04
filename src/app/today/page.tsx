"use client";

import { useEffect, useMemo, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import type { Question } from "@/lib/types";
import { getTodayProgress, getTodayQuestion, saveTodayAnswer } from "@/lib/todayQuestionService";

export default function TodayPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const selected = getTodayQuestion();
    const progress = getTodayProgress();
    setQuestion(selected);
    setAnswer(progress?.answer ?? "");
    setSubmitted(Boolean(progress?.solved));
    setMessage(progress?.solved ? (progress.correct ? "오늘의 문제를 맞혔습니다." : "오늘의 문제를 다시 확인해보세요.") : "오늘의 문제를 풀어보세요.");
  }, []);

  const handleSubmit = () => {
    if (!question) return;

    const isCorrect = question.answerType === "multiple_choice"
      ? answer === question.options[question.answer]
      : answer.trim().length > 0;

    saveTodayAnswer(answer, isCorrect);
    setSubmitted(true);
    setMessage(isCorrect ? "정답입니다! 오늘의 문제를 완료했습니다." : "다시 생각해보면 더 좋은 답이 나올 수 있어요.");
  };

  const answerSummary = useMemo(() => {
    if (!question) return "";
    return question.answerType === "multiple_choice"
      ? `정답은 ${question.options[question.answer]} 입니다.`
      : `핵심 키워드를 넣어 한 번 더 써보세요.`;
  }, [question]);

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">오늘의 문제</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">매일 한 번, 짧게 도전해보세요</h2>
        <p className="mt-3 text-slate-300">오늘의 문제는 하루에 한 번만 새로 생성됩니다. 정답을 기록하면 이어서 복습할 수 있습니다.</p>
      </section>

      {question ? (
        <section className="space-y-6">
          <QuestionCard question={question} selected={answer} onSelect={setAnswer} disabled={submitted} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitted}
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {submitted ? "오늘의 문제 완료" : "정답 제출"}
            </button>
            <p className="text-sm text-slate-300">{message}</p>
          </div>
          {submitted ? <p className="text-sm text-slate-400">{answerSummary}</p> : null}
        </section>
      ) : (
        <p className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-300">문제를 불러오는 중입니다.</p>
      )}
    </div>
  );
}
