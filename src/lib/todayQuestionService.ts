import type { Question } from "@/lib/types";
import { loadStorage, saveStorage } from "@/lib/utils";
import { questions } from "@/data/questions";

const TODAY_KEY = "munhae_today_question";

type TodayQuestionState = {
  date: string;
  questionId: string;
  solved: boolean;
  correct: boolean;
  answeredAt: string | null;
  answer: string;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

export const getTodayQuestion = (): Question | null => {
  const state = loadStorage<TodayQuestionState | null>(TODAY_KEY, null);
  const today = getTodayKey();

  if (state?.date === today) {
    return questions.find((item) => item.id === state.questionId) ?? null;
  }

  const nextQuestion = questions[Math.floor(Math.random() * questions.length)] ?? null;
  if (!nextQuestion) return null;

  saveStorage(TODAY_KEY, {
    date: today,
    questionId: nextQuestion.id,
    solved: false,
    correct: false,
    answeredAt: null,
    answer: "",
  });

  return nextQuestion;
};

export const saveTodayAnswer = (answer: string, isCorrect: boolean) => {
  const today = getTodayKey();
  const saved = loadStorage<TodayQuestionState | null>(TODAY_KEY, null);
  const next: TodayQuestionState = {
    date: today,
    questionId: saved?.questionId ?? "",
    solved: true,
    correct: isCorrect,
    answeredAt: new Date().toISOString(),
    answer,
  };
  saveStorage(TODAY_KEY, next);
  return next;
};

export const getTodayProgress = () => {
  return loadStorage<TodayQuestionState | null>(TODAY_KEY, null);
};
