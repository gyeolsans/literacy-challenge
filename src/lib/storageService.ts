import type { QuizResult, RankingRecord, UserInfo, WrongNoteItem } from "@/lib/types";
import { loadStorage, saveStorage } from "@/lib/utils";

const USER_KEY = "munhae_user";
const RANKING_KEY = "munhae_ranking";
const WRONG_NOTE_KEY = "munhae_wrong_notes";
const LAST_RESULT_KEY = "munhae_last_result";

export const loadUser = (): UserInfo | null => {
  return loadStorage<UserInfo | null>(USER_KEY, null);
};

export const saveUser = (user: UserInfo) => {
  saveStorage(USER_KEY, user);
};

export const loadRanking = (): RankingRecord[] => {
  return loadStorage<RankingRecord[]>(RANKING_KEY, []);
};

export const saveRanking = (records: RankingRecord[]) => {
  saveStorage(RANKING_KEY, records);
};

export const loadWrongNotes = (): WrongNoteItem[] => {
  return loadStorage<WrongNoteItem[]>(WRONG_NOTE_KEY, []);
};

export const saveWrongNotes = (notes: WrongNoteItem[]) => {
  saveStorage(WRONG_NOTE_KEY, notes);
};

export const saveLastResult = (result: QuizResult) => {
  saveStorage(LAST_RESULT_KEY, result);
};

export const loadLastResult = (): QuizResult | null => {
  return loadStorage<QuizResult | null>(LAST_RESULT_KEY, null);
};
