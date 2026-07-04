import { getStorage, setStorage } from "@/utils/storageUtils";
import { getTodayString, getWeekKey, isSameDay } from "@/utils/dateUtils";
import type { RankingRecord, Difficulty } from "@/lib/types";

const RANKING_KEY = "munhae_rankings";

export const getRankings = (): RankingRecord[] => {
  return getStorage<RankingRecord[]>(RANKING_KEY, []);
};

export const saveRanking = (record: RankingRecord) => {
  const records = [record, ...getRankings()];
  setStorage(RANKING_KEY, records);
};

export const updateRanking = (recordId: string, newRecord: RankingRecord) => {
  const records = getRankings().map((item) => (item.id === recordId ? newRecord : item));
  setStorage(RANKING_KEY, records);
};

export const clearRankings = () => {
  setStorage(RANKING_KEY, []);
};

export const getTodayRankings = () => {
  const today = getTodayString();
  return getRankings().filter((item) => isSameDay(item.date, today));
};

export const getWeeklyRankings = () => {
  const weekKey = getWeekKey();
  return getRankings().filter((item) => getWeekKey(item.date) === weekKey);
};

export const getRankingsByDifficulty = (difficulty: Difficulty) => {
  return getRankings().filter((item) => item.difficulty === difficulty);
};

export const getRankingsByMode = (mode: string) => {
  return getRankings().filter((item) => item.mode === mode);
};

export const getUserRankings = (nickname: string) => {
  return getRankings().filter((item) => item.nickname === nickname);
};

export const searchRankings = (keyword: string) => {
  const lower = keyword.trim().toLowerCase();
  return getRankings().filter((item) => item.nickname.toLowerCase().includes(lower));
};

export const sortRankings = (rankings: RankingRecord[], sortType: "score" | "time" | "date") => {
  return [...rankings].sort((a, b) => {
    if (sortType === "score") {
      if (b.score !== a.score) return b.score - a.score;
    }
    if (sortType === "time") {
      if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    }
    if (sortType === "date") {
      return new Date(b.date).valueOf() - new Date(a.date).valueOf();
    }
    if (b.score !== a.score) return b.score - a.score;
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    return new Date(b.date).valueOf() - new Date(a.date).valueOf();
  });
};
