import type { AchievementRecord, RankingRecord } from "@/lib/types";
import { loadStorage, saveStorage } from "@/lib/utils";

const ACHIEVEMENTS_KEY = "munhae_achievements";

const defaultAchievements: AchievementRecord[] = [
  { id: "first_test", title: "첫 도전", description: "첫 테스트를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "five_tests", title: "5회 도전", description: "5회 테스트를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "ten_tests", title: "10회 도전", description: "10회 테스트를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "score_80", title: "중급 점수", description: "80점 이상을 달성했습니다.", achieved: false, achievedAt: null },
  { id: "score_90", title: "고급 점수", description: "90점 이상을 달성했습니다.", achieved: false, achievedAt: null },
  { id: "score_100", title: "퍼펙트", description: "100점을 달성했습니다.", achieved: false, achievedAt: null },
  { id: "grade_s", title: "S급 달성", description: "S급 기준을 달성했습니다.", achieved: false, achievedAt: null },
  { id: "complete_hard", title: "어려움 클리어", description: "어려움 난이도를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "wrong_10", title: "오답 10개", description: "오답노트에 10개 이상의 문제를 등록했습니다.", achieved: false, achievedAt: null },
  { id: "mastered_5", title: "숙달 5개", description: "오답노트 문제 5개를 숙달 완료했습니다.", achieved: false, achievedAt: null },
];

export const getAchievements = (): AchievementRecord[] => {
  return loadStorage<AchievementRecord[]>(ACHIEVEMENTS_KEY, defaultAchievements);
};

export const unlockAchievement = (id: string) => {
  const achievements = getAchievements();
  const next = achievements.map((item) => {
    if (item.id !== id || item.achieved) return item;
    return { ...item, achieved: true, achievedAt: new Date().toISOString() };
  });
  saveStorage(ACHIEVEMENTS_KEY, next);
  return next.find((item) => item.id === id) ?? null;
};

export const resetAchievements = () => {
  saveStorage(ACHIEVEMENTS_KEY, defaultAchievements);
};

export const checkAchievements = (
  userStats: { totalTests: number },
  result: RankingRecord,
  wrongNotes: { isMastered: boolean }[],
) => {
  const achievements = getAchievements();
  const unlocked: AchievementRecord[] = [];

  const produce = (id: string) => {
    const item = achievements.find((achievement) => achievement.id === id);
    if (item && !item.achieved) {
      unlocked.push({ ...item, achieved: true, achievedAt: new Date().toISOString() });
    }
  };

  if (userStats.totalTests >= 1) produce("first_test");
  if (userStats.totalTests >= 5) produce("five_tests");
  if (userStats.totalTests >= 10) produce("ten_tests");
  if (result.score >= 80) produce("score_80");
  if (result.score >= 90) produce("score_90");
  if (result.score === 100) {
    produce("score_100");
    produce("grade_s");
  }
  if (result.difficulty === "hard") produce("complete_hard");
  if (wrongNotes.length >= 10) produce("wrong_10");
  if (wrongNotes.filter((note) => note.isMastered).length >= 5) produce("mastered_5");

  if (unlocked.length > 0) {
    const next = achievements.map((item) => {
      const found = unlocked.find((unlock) => unlock.id === item.id);
      return found ?? item;
    });
    saveStorage(ACHIEVEMENTS_KEY, next);
  }

  return unlocked;
};
