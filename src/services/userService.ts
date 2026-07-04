import { getStorage, setStorage } from "@/utils/storageUtils";
import { getTodayString } from "@/utils/dateUtils";
import type { AchievementRecord, AttendanceData, Goal, RankingRecord, TestRecord, UserInfo } from "@/lib/types";

const USER_KEY = "munhae_user";
const profanityList = ["바보", "멍청", "씨발", "병신", "꺼져"];

const createDefaultUser = (): UserInfo => ({
  id: `user_${Date.now()}`,
  nickname: "게스트",
  level: 1,
  experience: 0,
  totalExperience: 0,
  title: "독해 입문자",
  totalTests: 0,
  bestScore: 0,
  averageScore: 0,
  totalCorrect: 0,
  totalWrong: 0,
  totalPartial: 0,
  totalTime: 0,
  createdAt: getTodayString(),
  updatedAt: getTodayString(),
  lastPlayedAt: "",
  testRecords: [],
  attendance: { totalDays: 0, streak: 0, lastCheckIn: "", rewardsClaimed: [] },
  goals: [],
  achievements: [],
  todayQuestion: null,
});

export const getUser = (): UserInfo => {
  return getStorage<UserInfo>(USER_KEY, createDefaultUser());
};

export const saveUser = (user: UserInfo) => {
  setStorage(USER_KEY, { ...user, updatedAt: getTodayString() });
};

export const updateNickname = (nickname: string): boolean => {
  const trimmed = nickname.trim();
  if (trimmed.length < 2 || trimmed.length > 10) return false;
  if (profanityList.some((word) => trimmed.includes(word))) return false;
  const user = getUser();
  saveUser({ ...user, nickname: trimmed, updatedAt: getTodayString() });
  return true;
};

export const addExperience = (score: number, isChallenge = false) => {
  const user = getUser();
  let gain = 20;
  if (score >= 60) gain += 10;
  if (score >= 80) gain += 20;
  if (score >= 90) gain += 30;
  if (score === 100) gain += 50;
  if (isChallenge) gain += 30;
  const nextExperience = user.experience + gain;
  let level = user.level;
  let remaining = nextExperience;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level += 1;
  }
  const nextUser = {
    ...user,
    level,
    experience: remaining,
    totalExperience: user.totalExperience + gain,
    title: getTitleByLevel(level),
    updatedAt: getTodayString(),
  };
  saveUser(nextUser);
  return { user: nextUser, gained: gain, leveledUp: level > user.level, levelBefore: user.level, levelAfter: level };
};

export const getTitleByLevel = (level: number) => {
  if (level >= 50) return "문해력 지배자";
  if (level >= 30) return "문해력 고수";
  if (level >= 20) return "추론 마스터";
  if (level >= 10) return "핵심 포착러";
  if (level >= 5) return "문장 탐험가";
  return "독해 입문자";
};

export const addTestRecord = (record: RankingRecord) => {
  const user = getUser();
  const nextRecords = [record, ...user.testRecords].slice(0, 50);
  const totalCorrect = user.totalCorrect + record.correctCount;
  const totalWrong = user.totalWrong + record.wrongCount;
  const totalPartial = user.totalPartial + record.partialCount;
  const totalTests = user.totalTests + 1;
  const averageScore = Math.round((user.averageScore * user.totalTests + record.score) / totalTests);
  saveUser({
    ...user,
    testRecords: nextRecords,
    totalTests,
    bestScore: Math.max(user.bestScore, record.score),
    averageScore,
    totalCorrect,
    totalWrong,
    totalPartial,
    totalTime: user.totalTime + record.totalTime,
    lastPlayedAt: record.date,
    updatedAt: getTodayString(),
  });
};

export const getUserStats = () => {
  const user = getUser();
  const accuracy = user.totalCorrect + user.totalWrong ? Math.round((user.totalCorrect / (user.totalCorrect + user.totalWrong)) * 100) : 0;
  const shortAccuracy = 0;
  const strongType = user.testRecords.length ? Object.entries(user.testRecords[0].problemTypeStats).sort((a, b) => b[1].correctCount / b[1].totalCount - a[1].correctCount / a[1].totalCount)[0]?.[0] ?? "-" : "-";
  const weakType = user.testRecords.length ? Object.entries(user.testRecords[0].problemTypeStats).sort((a, b) => a[1].correctCount / a[1].totalCount - b[1].correctCount / b[1].totalCount)[0]?.[0] ?? "-" : "-";

  return {
    ...user,
    nextLevelExp: user.level * 100,
    accuracy,
    shortAnswerAccuracy: shortAccuracy,
    strongType,
    weakType,
  };
};

export const resetUserData = () => {
  const defaultUser = createDefaultUser();
  saveUser(defaultUser);
  return defaultUser;
};
