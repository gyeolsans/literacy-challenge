"use client";

import type { Question } from "@/lib/types";

type Props = {
  question: Question;
  selected: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
};

export default function QuestionCard({ question, selected, onSelect, disabled }: Props) {
  const choices = question.answerType === "multiple_choice" ? question.options ?? [] : [];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">문제</p>
      <h2 className="mt-3 text-lg font-semibold text-white">{question.question}</h2>
      {question.passage ? <p className="mt-3 text-sm leading-7 text-slate-300">{question.passage}</p> : null}

      {question.answerType === "multiple_choice" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {choices.map((choice) => {
            const isSelected = selected === choice;
            return (
              <button
                key={choice}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(choice)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-accent bg-accent/15 text-white"
                    : "border-slate-700 bg-slate-950 text-slate-200 hover:border-accent/80 hover:bg-slate-800"
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <textarea
            value={selected ?? ""}
            onChange={(event) => onSelect(event.target.value)}
            disabled={disabled}
            rows={4}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-0"
            placeholder="짧은 답을 입력해 주세요"
          />
          <p className="text-sm text-slate-400">예시 답변을 참고해서 핵심 키워드를 담아 답해보세요.</p>
        </div>
      )}
    </div>
  );
}
