import type { QuestionResult, WrongNoteItem } from "@/lib/types";
import { generateId, loadStorage, saveStorage } from "@/lib/utils";

const WRONG_NOTES_KEY = "munhae_wrong_notes";

type FilterOptions = {
  difficulty?: string;
  type?: string;
};

export const getWrongNotes = (): WrongNoteItem[] => {
  return loadStorage<WrongNoteItem[]>(WRONG_NOTES_KEY, []);
};

export const addWrongNote = (question: QuestionResult) => {
  if (question.isCorrect) {
    const existing = getWrongNotes().find((item) => item.questionId === question.questionId);
    if (!existing) return;
    return;
  }

  const notes = getWrongNotes();
  const noteIndex = notes.findIndex((item) => item.questionId === question.questionId);
  if (noteIndex >= 0) {
    const updated = [...notes];
    updated[noteIndex] = {
      ...updated[noteIndex],
      selectedAnswer: question.selectedAnswer,
      lastWrongDate: new Date().toISOString(),
      wrongCount: updated[noteIndex].wrongCount + 1,
      isMastered: false,
    };
    saveStorage(WRONG_NOTES_KEY, updated);
    return;
  }

  const nextNote: WrongNoteItem = {
    questionId: question.questionId,
    passage: question.passage,
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    selectedAnswer: question.selectedAnswer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    type: question.type,
    wrongCount: 1,
    lastWrongDate: new Date().toISOString(),
    isMastered: false,
  };

  saveStorage(WRONG_NOTES_KEY, [...notes, nextNote]);
};

export const removeWrongNote = (questionId: string) => {
  const notes = getWrongNotes();
  saveStorage(WRONG_NOTES_KEY, notes.filter((note) => note.questionId !== questionId));
};

export const clearWrongNotes = () => {
  saveStorage(WRONG_NOTES_KEY, []);
};

export const markAsMastered = (questionId: string) => {
  const notes = getWrongNotes();
  const updated = notes.map((note) =>
    note.questionId === questionId ? { ...note, isMastered: true } : note,
  );
  saveStorage(WRONG_NOTES_KEY, updated);
};

export const getFrequentWrongNotes = (): WrongNoteItem[] => {
  return getWrongNotes().filter((note) => note.wrongCount >= 2);
};

export const getUnmasteredWrongNotes = (): WrongNoteItem[] => {
  return getWrongNotes().filter((note) => !note.isMastered);
};

export const filterWrongNotes = ({ difficulty, type }: FilterOptions): WrongNoteItem[] => {
  return getWrongNotes().filter((note) => {
    if (difficulty && note.difficulty !== difficulty) return false;
    if (type && note.type !== type) return false;
    return true;
  });
};
