import { getStorage, setStorage } from "@/utils/storageUtils";
import { getTodayString } from "@/utils/dateUtils";
import type { WrongNoteItem, QuestionResult, Question } from "@/lib/types";

const WRONG_NOTE_KEY = "munhae_wrong_notes";

export const getWrongNotes = (): WrongNoteItem[] => {
  return getStorage<WrongNoteItem[]>(WRONG_NOTE_KEY, []);
};

export const saveWrongNotes = (items: WrongNoteItem[]) => {
  setStorage(WRONG_NOTE_KEY, items);
};

export const addWrongNote = (question: Question, result: QuestionResult) => {
  const notes = getWrongNotes();
  const existing = notes.find((item) => item.questionId === question.id);
  const wrongCount = (existing?.wrongCount ?? 0) + 1;
  const entry: WrongNoteItem = {
    questionId: question.id,
    passage: question.passage,
    question: question.question,
    options: question.answerType === "multiple_choice" ? question.options : undefined,
    correctAnswer: question.answerType === "multiple_choice" ? question.options[question.answer] : question.sampleAnswers?.[0] ?? "",
    selectedAnswer: result.selectedAnswer,
    userAnswer: result.selectedAnswer,
    sampleAnswers: question.answerType === "short_answer" ? question.sampleAnswers : undefined,
    explanation: question.explanation,
    difficulty: question.difficulty,
    type: question.type,
    answerType: question.answerType,
    wrongCount,
    lastWrongDate: getTodayString(),
    isMastered: false,
  };
  if (existing) {
    saveWrongNotes(notes.map((item) => (item.questionId === question.id ? { ...item, ...entry } : item)));
  } else {
    saveWrongNotes([entry, ...notes]);
  }
};

export const removeWrongNote = (questionId: string) => {
  saveWrongNotes(getWrongNotes().filter((item) => item.questionId !== questionId));
};

export const clearWrongNotes = () => {
  saveWrongNotes([]);
};

export const markAsMastered = (questionId: string) => {
  saveWrongNotes(
    getWrongNotes().map((item) => (item.questionId === questionId ? { ...item, isMastered: true } : item)),
  );
};

export const getFrequentWrongNotes = () => {
  return getWrongNotes().filter((item) => item.wrongCount >= 2);
};

export const getUnmasteredWrongNotes = () => {
  return getWrongNotes().filter((item) => !item.isMastered);
};

export const filterWrongNotes = ({ difficulty, type, answerType }: { difficulty?: string; type?: string; answerType?: string }) => {
  return getWrongNotes().filter((item) => {
    if (difficulty && difficulty !== "all" && item.difficulty !== difficulty) return false;
    if (type && type !== "all" && item.type !== type) return false;
    if (answerType && answerType !== "all" && item.answerType !== answerType) return false;
    return true;
  });
};
