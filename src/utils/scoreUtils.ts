import type { QuestionResult } from "@/lib/types";

export function calculateGrade(scorePercent: number) {
  if (scorePercent >= 90) return "S";
  if (scorePercent >= 80) return "A";
  if (scorePercent >= 70) return "B";
  if (scorePercent >= 60) return "C";
  if (scorePercent >= 50) return "D";
  return "E";
}

export function calculateScore(results: QuestionResult[]) {
  return results.reduce((sum, item) => sum + item.earnedPoints, 0);
}

export function calculateAccuracy(results: QuestionResult[]) {
  if (!results.length) return 0;
  const correct = results.filter((item) => item.isCorrect).length;
  return Math.round((correct / results.length) * 100);
}

export function calculateTypeStats(results: QuestionResult[]) {
  return results.reduce<Record<string, { correct: number; total: number }>>((acc, item) => {
    const type = item.type || "기타";
    const entry = acc[type] ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (item.isCorrect) entry.correct += 1;
    acc[type] = entry;
    return acc;
  }, {});
}

export function calculateDifficultyStats(results: QuestionResult[]) {
  return results.reduce<Record<string, { score: number; total: number }>>((acc, item) => {
    const difficulty = item.difficulty || "normal";
    const entry = acc[difficulty] ?? { score: 0, total: 0 };
    entry.score += item.earnedPoints;
    entry.total += 1;
    acc[difficulty] = entry;
    return acc;
  }, {});
}

export function getAdviceByWeakType(type: string) {
  if (!type) return "다양한 유형을 고르게 복습해보세요.";
  return `${type} 유형을 집중적으로 연습하면 더 안정적인 점수를 얻을 수 있습니다.`;
}

export function getModeBonus(mode: string) {
  if (mode === "challenge") return 30;
  if (mode === "quick") return 10;
  if (mode === "practice") return 5;
  return 0;
}
