import { getStorage, setStorage } from "@/utils/storageUtils";
import { questions as initialQuestions } from "@/data/questions";
import type { Question } from "@/lib/types";

const QUESTION_KEY = "munhae_questions";

export const getQuestions = (): Question[] => {
  return getStorage<Question[]>(QUESTION_KEY, initialQuestions);
};

export const saveQuestions = (items: Question[]) => {
  setStorage(QUESTION_KEY, items);
};

export const getQuestionById = (id: string) => {
  return getQuestions().find((item) => item.id === id) ?? null;
};

export const addQuestion = (question: Question) => {
  const items = getQuestions();
  saveQuestions([question, ...items]);
};

export const updateQuestion = (id: string, updated: Partial<Question>) => {
  const items = getQuestions().map((item) => (item.id === id ? { ...item, ...updated } : item));
  saveQuestions(items);
};

export const deleteQuestion = (id: string) => {
  saveQuestions(getQuestions().filter((item) => item.id !== id));
};

export const resetQuestions = () => {
  saveQuestions(initialQuestions);
};
