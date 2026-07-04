import type { Difficulty, ProblemTypeStats, RankingRecord } from "@/lib/types";
import { generateId, loadStorage, saveStorage } from "@/lib/utils";

const RANKING_KEY = "munhae_ranking";

type SortType = "score" | "time" | "date";

const compareDefault = (a: RankingRecord, b: RankingRecord) => {
  if (b.score !== a.score) return b.score - a.score;
  if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
  return b.date.localeCompare(a.date);
};

export const getRankings = (): RankingRecord[] => {
  return loadStorage<RankingRecord[]>(RANKING_KEY, []);
};

export const saveRanking = (record: RankingRecord) => {
  const rankings = getRankings();
  const recordWithId = record.id ? record : { ...record, id: generateId("rank") };
  const next = [...rankings, recordWithId].sort(compareDefault).slice(0, 200);
  saveStorage(RANKING_KEY, next);
  return recordWithId;
};

export const clearRankings = () => {
  saveStorage(RANKING_KEY, []);
};

export const getTodayRankings = (): RankingRecord[] => {
  const today = new Date().toISOString().slice(0, 10);
  return getRankings().filter((record) => record.date.slice(0, 10) === today);
};

export const getWeeklyRankings = (): RankingRecord[] => {
  const rankings = getRankings();
  const now = Date.now();
  return rankings.filter((record) => {
    const recordTime = new Date(record.date).getTime();
    return now - recordTime <= 7 * 24 * 60 * 60 * 1000;
  });
};

export const getRankingsByDifficulty = (difficulty: Difficulty): RankingRecord[] => {
  return getRankings().filter((record) => record.difficulty === difficulty);
};

export const getUserRankings = (nickname: string): RankingRecord[] => {
  return getRankings().filter((record) => record.nickname === nickname);
};

export const searchRankings = (keyword: string): RankingRecord[] => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return getRankings();
  return getRankings().filter((record) => record.nickname.toLowerCase().includes(normalized));
};

export const sortRankings = (rankings: RankingRecord[], sortType: SortType): RankingRecord[] => {
  const next = [...rankings];
  if (sortType === "time") {
    return next.sort((a, b) => a.totalTime - b.totalTime || b.score - a.score || b.date.localeCompare(a.date));
  }
  if (sortType === "date") {
    return next.sort((a, b) => b.date.localeCompare(a.date) || a.totalTime - b.totalTime || b.score - a.score);
  }
  return next.sort(compareDefault);
};

export const createProblemTypeStats = (records: { type: string; isCorrect: boolean }[]): ProblemTypeStats => {
  return records.reduce<ProblemTypeStats>((acc, item) => {
    const stats = acc[item.type] ?? { correctCount: 0, totalCount: 0 };
    stats.totalCount += 1;
    if (item.isCorrect) stats.correctCount += 1;
    acc[item.type] = stats;
    return acc;
  }, {});
};

export const getProblemTypeAccuracy = (stats: ProblemTypeStats) => {
  return Object.entries(stats).map(([type, value]) => ({
    type,
    accuracy: value.totalCount > 0 ? value.correctCount / value.totalCount : 0,
  }));
};

export const getBestType = (stats: ProblemTypeStats) => {
  const entries = getProblemTypeAccuracy(stats);
  if (!entries.length) return "없음";
  return entries.sort((a, b) => b.accuracy - a.accuracy)[0].type;
};

export const getWeakestType = (stats: ProblemTypeStats) => {
  const entries = getProblemTypeAccuracy(stats);
  if (!entries.length) return "없음";
  return entries.sort((a, b) => a.accuracy - b.accuracy)[0].type;
};
