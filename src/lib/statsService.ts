import { getUser } from "@/lib/userService";
import type { RankingRecord } from "@/lib/types";

export const getAllTestRecords = (): RankingRecord[] => {
  return getUser()?.testRecords ?? [];
};

export const getBasicStats = () => {
  const records = getAllTestRecords();
  const totalTests = records.length;
  const bestScore = records.reduce((max, item) => Math.max(max, item.score), 0);
  const averageScore = totalTests ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / totalTests) : 0;
  const totalCorrect = records.reduce((sum, item) => sum + item.correctCount, 0);
  const totalWrong = records.reduce((sum, item) => sum + item.wrongCount, 0);
  const accuracy = totalCorrect + totalWrong ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0;

  return { totalTests, bestScore, averageScore, accuracy };
};

export const getScoreTrend = () => {
  const records = getAllTestRecords().slice(0, 5).reverse();
  return records.map((record) => ({ date: new Date(record.date).toLocaleDateString(), score: record.score }));
};

export const getDifficultyStats = () => {
  const records = getAllTestRecords();
  const map: Record<string, { totalScore: number; count: number }> = {};
  records.forEach((record) => {
    const diff = record.difficulty;
    const current = map[diff] ?? { totalScore: 0, count: 0 };
    current.totalScore += record.score;
    current.count += 1;
    map[diff] = current;
  });
  return Object.entries(map).map(([difficulty, value]) => ({
    difficulty,
    averageScore: value.count ? Math.round(value.totalScore / value.count) : 0,
  }));
};

export const getTypeAccuracyStats = () => {
  const records = getAllTestRecords();
  const map: Record<string, { correct: number; total: number }> = {};
  records.forEach((record) => {
    Object.entries(record.problemTypeStats).forEach(([type, stats]) => {
      const current = map[type] ?? { correct: 0, total: 0 };
      current.correct += stats.correctCount;
      current.total += stats.totalCount;
      map[type] = current;
    });
  });
  return Object.entries(map).map(([type, value]) => ({
    type,
    accuracy: value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0,
  }));
};

export const getGradeDistribution = () => {
  const records = getAllTestRecords();
  const map: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  records.forEach((record) => {
    map[record.grade] = (map[record.grade] ?? 0) + 1;
  });
  return Object.entries(map).map(([grade, count]) => ({ grade, count }));
};

export const getWeakestType = () => {
  const stats = getTypeAccuracyStats();
  if (!stats.length) return "-";
  return stats.sort((a, b) => a.accuracy - b.accuracy)[0].type;
};

export const getStrongestType = () => {
  const stats = getTypeAccuracyStats();
  if (!stats.length) return "-";
  return stats.sort((a, b) => b.accuracy - a.accuracy)[0].type;
};
