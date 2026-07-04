import { getStorage, setStorage } from "@/utils/storageUtils";
import { getTodayString } from "@/utils/dateUtils";
import { getQuestions } from "@/services/questionService";
import type { Question, TodayQuestionRecord } from "@/lib/types";

const TODAY_KEY = "munhae_today_question";

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getTodayQuestionStatus = (): TodayQuestionRecord | null => {
  return getStorage<TodayQuestionRecord | null>(TODAY_KEY, null);
};

export const getTodayQuestion = (): { question: Question; record: TodayQuestionRecord } => {
  const questions = getQuestions();
  const today = getTodayString();
  const stored = getTodayQuestionStatus();
  const index = hashString(today) % questions.length;
  const question = questions[index];
  const record: TodayQuestionRecord = stored && stored.date === today ? stored : { date: today, questionId: question.id, solved: false, correct: false, answeredAt: null };
  if (!stored || stored.date !== today) {
    setStorage(TODAY_KEY, record);
  }
  return { question, record };
};

export const saveTodayQuestionResult = (result: TodayQuestionRecord) => {
  setStorage(TODAY_KEY, result);
};

export const getTodayStreak = () => {
  const current = getTodayQuestionStatus();
  return current?.correct ? 1 : 0;
};

export const resetTodayQuestionData = () => {
  setStorage(TODAY_KEY, null);
};
