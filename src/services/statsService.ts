import { getRankings } from "@/services/rankingService";
import type { RankingRecord } from "@/lib/types";

export const getAllTestRecords = (): RankingRecord[] => {
  return getRankings();
};

export const getBasicStats = () => {
  const records = getAllTestRecords();
  const totalTests = records.length;
  const bestScore = records.reduce((max, item) => Math.max(max, item.score), 0);
  const averageScore = totalTests ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / totalTests) : 0;
  const totalCorrect = records.reduce((sum, item) => sum + item.correctCount, 0);
  const totalWrong = records.reduce((sum, item) => sum + item.wrongCount, 0);
  const partialCount = records.reduce((sum, item) => sum + item.partialCount, 0);
  const accuracy = totalCorrect + totalWrong ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0;
  return { totalTests, bestScore, averageScore, totalCorrect, totalWrong, partialCount, accuracy };
};

export const getScoreTrend = () => {
  return getAllTestRecords()
    .slice(0, 10)
    .reverse()
    .map((record, index) => ({ name: `#${getAllTestRecords().length - index}`, score: record.score }));
};

export const getTimeTrend = () => {
  return getAllTestRecords()
    .slice(0, 10)
    .reverse()
    .map((record, index) => ({ name: `#${getAllTestRecords().length - index}`, time: record.averageTime }));
};

export const getDifficultyStats = () => {
  const records = getAllTestRecords();
  const map: Record<string, { score: number; count: number }> = {};
  records.forEach((record) => {
    const entry = map[record.difficulty] ?? { score: 0, count: 0 };
    entry.score += record.score;
    entry.count += 1;
    map[record.difficulty] = entry;
  });
  return Object.entries(map).map(([difficulty, entry]) => ({ difficulty, averageScore: Math.round(entry.score / entry.count) }));
};

export const getModeStats = () => {
  const records = getAllTestRecords();
  const map: Record<string, { score: number; count: number }> = {};
  records.forEach((record) => {
    const entry = map[record.mode] ?? { score: 0, count: 0 };
    entry.score += record.score;
    entry.count += 1;
    map[record.mode] = entry;
  });
  return Object.entries(map).map(([mode, entry]) => ({ mode, averageScore: Math.round(entry.score / entry.count) }));
};

export const getTypeAccuracyStats = () => {
  const records = getAllTestRecords();
  const typeMap: Record<string, { correct: number; total: number }> = {};
  records.forEach((record) => {
    Object.entries(record.problemTypeStats).forEach(([type, stat]) => {
      const entry = typeMap[type] ?? { correct: 0, total: 0 };
      entry.correct += stat.correctCount;
      entry.total += stat.totalCount;
      typeMap[type] = entry;
    });
  });
  return Object.entries(typeMap).map(([type, stat]) => ({ type, accuracy: stat.total ? Math.round((stat.correct / stat.total) * 100) : 0 }));
};

export const getGradeDistribution = () => {
  const records = getAllTestRecords();
  const map: Record<string, number> = {};
  records.forEach((record) => {
    map[record.grade] = (map[record.grade] ?? 0) + 1;
  });
  return Object.entries(map).map(([grade, value]) => ({ grade, value }));
};

export const getWeakestType = () => {
  const stats = getTypeAccuracyStats();
  return stats.sort((a, b) => a.accuracy - b.accuracy)[0]?.type ?? "-";
};

export const getStrongestType = () => {
  const stats = getTypeAccuracyStats();
  return stats.sort((a, b) => b.accuracy - a.accuracy)[0]?.type ?? "-";
};
