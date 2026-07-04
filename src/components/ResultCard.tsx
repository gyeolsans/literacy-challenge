import type { QuestionResult } from "@/lib/types";

type Props = {
  result: QuestionResult;
  onAdjust?: (questionId: string, mode: "correct" | "partial" | "wrong") => void;
};

export default function ResultCard({ result, onAdjust }: Props) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{result.difficulty} · {result.type}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{result.question}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.isCorrect ? "bg-emerald-500/20 text-emerald-200" : result.isPartial ? "bg-amber-500/20 text-amber-200" : "bg-rose-500/20 text-rose-200"}`}>
          {result.isCorrect ? "정답" : result.isPartial ? "부분 정답" : "오답"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">내 답</p>
          <p className="mt-2 text-sm text-slate-100">{result.selectedAnswer || "제출 없음"}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">정답</p>
          <p className="mt-2 text-sm text-slate-100">{result.correctAnswer}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-300">해설: {result.explanation}</p>
      {onAdjust ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onAdjust(result.questionId, "correct")} className="rounded-2xl bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20">
            정답으로 인정
          </button>
          <button type="button" onClick={() => onAdjust(result.questionId, "partial")} className="rounded-2xl bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20">
            부분 정답
          </button>
          <button type="button" onClick={() => onAdjust(result.questionId, "wrong")} className="rounded-2xl bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20">
            오답으로 수정
          </button>
        </div>
      ) : null}
    </div>
  );
}
